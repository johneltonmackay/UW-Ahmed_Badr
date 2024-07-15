/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/redirect', 'N/search', 'N/runtime'],
    /**
 * @param{record} record
 * @param{redirect} redirect
 * @param{search} search
 */
    (record, redirect, search, runtime) => {

        const getInputData = (inputContext) => {
            let inputData = {}
            let skippedLines = []
            let validatedData = []
            let arrInputData = []
            let arrPayrollCycleIds = []
            let arrPayrollRecordJoin = []
            try {
                const suiteletParam = runtime.getCurrentScript().getParameter({name: 'custscript_epi_data'})
                let paramParseData = JSON.parse(suiteletParam)
                log.debug('getInputData: paramParseData', paramParseData);

                let paramArrEPIData = JSON.parse(paramParseData.epiData)
                let paramTransKey = paramParseData.transKey
                let arrPayrollCycleData = searchPayrollCycleEntries()
                let arrEmployeeId = searchEmployeeId()

                paramArrEPIData.forEach((data, index) => {

                    let {
                        custpage_batch_id_col_02,
                        custpage_file_no_col_03,
                        custpage_date_range,
                    } = data
        
                    const arrFilteredItems = arrPayrollCycleData.filter(item =>
                        item.batchId == custpage_batch_id_col_02 &&
                        item.dateRange == custpage_date_range
                    );
                    log.debug('arrPayrollCycleData arrFilteredItems', arrFilteredItems)
                
                    if (arrFilteredItems.length > 0) {
                        skippedLines.push({
                            lineNumber: index + 1,
                            lineValue: data, 
                            recId: arrFilteredItems[0].recId,
                            reason: 'Payroll Cycle Data Exist, Record ID: ' + arrFilteredItems[0].recId 
                        });
                        if(!arrPayrollCycleIds.includes(arrFilteredItems[0].recId)){
                            arrPayrollCycleIds.push(arrFilteredItems[0].recId)
                        }
                    } else {

                        const arrFilteredEmployee = arrEmployeeId.filter(item =>
                            item.fileNo == custpage_file_no_col_03
                        );
                        log.debug('arrEmployeeId arrFilteredEmployee', arrFilteredEmployee)

                        if (arrFilteredEmployee.length > 0) {
                            data.custpage_employee = arrFilteredEmployee[0].employeeId
                        }

                        validatedData.push(data)
                    }
                    
                });

                arrPayrollCycleIds.forEach(id => {
                    let arrPayrollRecordData = searchPayrollRecordEntries(id)
                    arrPayrollRecordJoin = [...arrPayrollRecordData, ...arrPayrollRecordJoin]
                });

                inputData = {
                    transKey: paramTransKey,
                    toProcess: validatedData,
                    skippedLines: skippedLines,
                    arrPayrollRecordJoin: arrPayrollRecordJoin
                }

            } catch (error) {
                log.error('getInputData error', error.message)
            }
            arrInputData.push(inputData)
            log.debug('getInputData arrInputData', arrInputData)
            return arrInputData;
        }

        const map = (mapContext) => {
            try {
                log.debug('map : mapContext', mapContext);
                let objMapValue = JSON.parse(mapContext.value)
                let transKey = objMapValue.transKey;
                let arrSkippedLines = objMapValue.arrPayrollRecordJoin

                arrSkippedLines.forEach(data => {
                    record.submitFields({
                        type: 'customrecord_epi4a110_child',
                        id: data.recId,
                        values: {
                            custrecord_transaction_keys: transKey, 
                            custrecord_remarks: 'Existing Record',
                        }
                    })
                });

                mapContext.write({
                    key: transKey,
                    value: objMapValue
                })

            } catch (error) {
                log.error('map error', error.message)
            }
        }

        const reduce = (reduceContext) => {
            log.debug('reduce : reduceContext', reduceContext);
            let objReduceValues = JSON.parse(reduceContext.values[0])
            log.debug('reduce objReduceValues', objReduceValues);
            
            let strTransKey = objReduceValues.transKey
            let arrToProcess = objReduceValues.toProcess
            let arrSkippedLines = objReduceValues.skippedLines

            log.debug('reduce arrToProcess', arrToProcess);
            log.debug('reduce arrSkippedLines', arrSkippedLines);

            if(arrToProcess.length > 0){
                let parentRecId = createEPIParent(objReduceValues)

                if (parentRecId){
                    log.debug('parentRecId', parentRecId)
                    arrToProcess.forEach(data => {
                        data.custpage_transaction_keys = strTransKey
                        data.custpage_remarks = 'Newly Created'
                        data.custpage_parent_record_id = parentRecId
                        data.custpage_date_range_child = arrToProcess[0].custpage_date_range
                        let objRecData = record.create({
                            type: 'customrecord_epi4a110_child',
                            isDynamic: true
                        })
                        for (const key in data) {
                            if(data[key] != undefined && data[key] != null && data[key] != ''){
                                let fieldIds = key.replace('custpage', 'custrecord')
                                let fieldValue = data[key]
                                objRecData.setValue({
                                    fieldId: fieldIds,
                                    value: fieldValue
                                })
                            }
                        }
                        let recordId = objRecData.save()
                        log.debug('reduce recordId', recordId) 
                    });     
                }
            } 
        }

        const summarize = (summaryContext) => {

        }

        //Private 

        const createEPIParent = (objReduceValues) => {
            let recordId = null
            try {
                let totalAmount7 = 0
                let totalAmount9 = 0
                let arrToProcess = objReduceValues.toProcess
                let arrSkippedLines = objReduceValues.skippedLines
                let tranKey = objReduceValues.transKey

                arrSkippedLines.forEach(data => {
                    let arrLineValue = data.lineValue
                    arrToProcess = [...arrToProcess, ...arrLineValue]
                    
                });

                arrToProcess.forEach(element => {
                    let amountCol7 = parseFloat(element.custpage_earn_5_amount_col_07)
                    let amountCol9 = parseFloat(element.custpage_earn_5_amount_col_09)
                    totalAmount7 = totalAmount7 + amountCol7
                    totalAmount9 = totalAmount9 + amountCol9
                });

                let objRecData = record.create({
                    type: 'customrecord_epi4a110_parent',
                    isDynamic: true
                })

                objRecData.setValue({
                    fieldId: 'custrecord_batch_id',
                    value: arrToProcess[0].custpage_batch_id_col_02
                })

                objRecData.setValue({
                    fieldId: 'custrecord_date_range',
                    value: arrToProcess[0].custpage_date_range
                })

                objRecData.setValue({
                    fieldId: 'custrecord_total_earn_5_amount_col_7',
                    value: totalAmount7
                })

                objRecData.setValue({
                    fieldId: 'custrecord_total_earn_5_amount_col_9',
                    value: totalAmount9
                })

                objRecData.setValue({
                    fieldId: 'custrecord_transaction_keys_pc',
                    value: tranKey
                })

                objRecData.setValue({
                    fieldId: 'custrecord_remarks_pc',
                    value: 'Newly Created'
                })

                recordId = objRecData.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                })
            } catch (error) {
                log.error('createEPIParent error', error.message)
            }
            log.debug('createEPIParent recordId', recordId)
            return recordId
        }

        const searchEmployeeId = () => {
            let arrEmployeeId = [];
            try {
                let objSearch = search.create({
                    type: 'employee',
                    filters: [
                        ['isinactive', 'is', 'F'],
                        'AND',
                        ['custentity_adp_file_number', 'isnotempty', ''],
                    ],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                        search.createColumn({ name: 'custentity_adp_file_number' }),
                    ],
                });
                var searchResultCount = objSearch.runPaged().count;
                if (searchResultCount != 0) {
                    var pagedData = objSearch.runPaged({pageSize: 1000});
                    for (var i = 0; i < pagedData.pageRanges.length; i++) {
                        var currentPage = pagedData.fetch(i);
                        var pageData = currentPage.data;
                        if (pageData.length > 0) {
                            for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                                arrEmployeeId.push({
                                    employeeId: pageData[pageResultIndex].getValue({name: 'internalid'}),
                                    fileNo: pageData[pageResultIndex].getValue({name: 'custentity_adp_file_number'}),
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                log.error('searchEmployeeId', err.message);
            }
            log.debug("searchEmployeeId: arrEmployeeId", arrEmployeeId)
            return arrEmployeeId;
        }

        const searchPayrollRecordEntries = (id) => {
            let arrPayrollRecordData = [];
            try {
                let objSearch = search.create({
                    type: 'customrecord_epi4a110_child',
                    filters: [
                        ['custrecord_parent_record_id', 'anyof', id],
                    ],
                    columns: [
                        search.createColumn({ name: 'internalid', sort: search.Sort.ASC }),
                        search.createColumn({ name: 'custrecord_co_code_col_01' }),
                        search.createColumn({ name: 'custrecord_batch_id_col_02' }),
                        search.createColumn({ name: 'custrecord_file_no_col_03' }),
                        search.createColumn({ name: 'custrecord_earn_5_code_col_04' }),
                        search.createColumn({ name: 'custrecord_earn_5_amount_col_05' }),
                        search.createColumn({ name: 'custrecord_earn_5_code_col_06' }),
                        search.createColumn({ name: 'custrecord_earn_5_amount_col_07' }),
                        search.createColumn({ name: 'custrecord_earn_5_code_col_08' }),
                        search.createColumn({ name: 'custrecord_earn_5_amount_col_09' }),
                        search.createColumn({ name: 'custrecord_transaction_keys' }),
                        search.createColumn({ name: 'custrecord_date_range_child' }),
                        search.createColumn({ name: 'custrecord_parent_record_id' }),

                    ],
                });
                var searchResultCount = objSearch.runPaged().count;
                if (searchResultCount != 0) {
                    var pagedData = objSearch.runPaged({pageSize: 1000});
                    for (var i = 0; i < pagedData.pageRanges.length; i++) {
                        var currentPage = pagedData.fetch(i);
                        var pageData = currentPage.data;
                        if (pageData.length > 0) {
                            for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                                arrPayrollRecordData.push({
                                    recId: pageData[pageResultIndex].getValue({name: 'internalid'}),
                                    parentId: pageData[pageResultIndex].getValue({ name: 'custrecord_parent_record_id' }),
                                    co_code_col_01: pageData[pageResultIndex].getValue({name: 'custrecord_co_code_col_01'}),
                                    batch_id_col_02: pageData[pageResultIndex].getValue({name: 'custrecord_batch_id_col_02'}),
                                    file_no_col_03: pageData[pageResultIndex].getValue({ name: 'custrecord_file_no_col_03' }),
                                    earn_5_code_col_04: pageData[pageResultIndex].getValue({ name: 'custrecord_earn_5_code_col_04' }),
                                    earn_5_amount_col_05: pageData[pageResultIndex].getValue({ name: 'custrecord_earn_5_amount_col_05' }),
                                    earn_5_code_col_06: pageData[pageResultIndex].getValue({ name: 'custrecord_earn_5_code_col_06' }),
                                    earn_5_amount_col_07: pageData[pageResultIndex].getValue({ name: 'custrecord_earn_5_amount_col_07' }),
                                    earn_5_code_col_08: pageData[pageResultIndex].getValue({ name: 'custrecord_earn_5_code_col_08' }),
                                    earn_5_amount_col_09: pageData[pageResultIndex].getValue({ name: 'custrecord_earn_5_amount_col_09' }),
                                    transaction_keys: pageData[pageResultIndex].getValue({ name: 'custrecord_transaction_keys' }),
                                    dateRange: pageData[pageResultIndex].getValue({ name: 'custrecord_date_range_child' }),
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                log.error('searchPayrollRecordEntries', err.message);
            }
            log.debug("searchPayrollRecordEntries: arrPayrollRecordData", arrPayrollRecordData)
            return arrPayrollRecordData;
        }

        const searchPayrollCycleEntries = () => {
            let arrPayrollCycleData = [];
            try {
                let objSearch = search.create({
                    type: 'customrecord_epi4a110_parent',
                    filters: [],
                    columns: [
                        search.createColumn({ name: 'internalid', sort: search.Sort.ASC }),
                        search.createColumn({ name: 'custrecord_batch_id' }),
                        search.createColumn({ name: 'custrecord_date_range' }),
                        search.createColumn({ name: 'custrecord_total_earn_5_amount_col_7' }),
                        search.createColumn({ name: 'custrecord_total_earn_5_amount_col_9' }),
                    ],
                });
                var searchResultCount = objSearch.runPaged().count;
                if (searchResultCount != 0) {
                    var pagedData = objSearch.runPaged({pageSize: 1000});
                    for (var i = 0; i < pagedData.pageRanges.length; i++) {
                        var currentPage = pagedData.fetch(i);
                        var pageData = currentPage.data;
                        if (pageData.length > 0) {
                            for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                                arrPayrollCycleData.push({
                                    recId: pageData[pageResultIndex].getValue({name: 'internalid'}),
                                    batchId: pageData[pageResultIndex].getValue({name: 'custrecord_batch_id'}),
                                    dateRange: pageData[pageResultIndex].getValue({name: 'custrecord_date_range'}),
                                    total_earn_5_amount_col_7: pageData[pageResultIndex].getValue({ name: 'custrecord_total_earn_5_amount_col_7' }),
                                    total_earn_5_amount_col_9: pageData[pageResultIndex].getValue({ name: 'custrecord_total_earn_5_amount_col_9' }),
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                log.error('searchPayrollCycleEntries', err.message);
            }
            log.debug("searchPayrollCycleEntries: arrPayrollCycleData", arrPayrollCycleData)
            return arrPayrollCycleData;
        }

        return {getInputData, map, reduce, summarize}

    });
