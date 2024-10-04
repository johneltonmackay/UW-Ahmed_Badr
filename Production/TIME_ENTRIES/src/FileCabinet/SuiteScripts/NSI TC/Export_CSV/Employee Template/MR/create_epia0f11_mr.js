/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/redirect', 'N/search', 'N/runtime', 'N/file', 'N/https'],
    /**
 * @param{record} record
 * @param{redirect} redirect
 * @param{search} search
 */
    (record, redirect, search, runtime, file, https) => {

        const getInputData = (inputContext) => {
            let inputData = {}
            let skippedLines = []
            let validatedData = []
            let arrInputData = []
            let arrPayrollCycleIds = []
            let arrPayrollRecordJoin = []
            try {
                const suiteletParam = runtime.getCurrentScript().getParameter({name: 'custscript_epia0f11_data'})
                let paramParseData = JSON.parse(suiteletParam)
                log.debug('getInputData: paramParseData', paramParseData);

                let paramArrEPIFileId = paramParseData.epiData
                let paramTransKey = paramParseData.transKey
                let arrPayrollCycleData = searchPayrollCycleEntries()
                let arrEmployeeId = searchEmployeeId()


                let fileObj = file.load({
                    id: paramArrEPIFileId
                });
            
                let fileContent = fileObj.getContents();
                let paramArrEPIData = JSON.parse(fileContent)
                log.debug('getInputData paramArrEPIData', paramArrEPIData)

                paramArrEPIData.forEach((data, index) => {

                    let {
                        custpage_epia0f11_batch_id_col_02,
                        custpage_epia0f11_file_no_03,
                        custpage_epia0f11_date_range,
                    } = data
        
                    const arrFilteredItems = arrPayrollCycleData.filter(item =>
                        item.batchId == custpage_epia0f11_batch_id_col_02 &&
                        item.dateRange == custpage_epia0f11_date_range
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
                            item.fileNo == custpage_epia0f11_file_no_03
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
                    paramFileId: paramArrEPIFileId,
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
                        type: 'customrecord_epia0f11_child',
                        id: data.recId,
                        values: {
                            custrecord_epia0f11_trans_key_child: transKey, 
                            custrecord_epia0f11_remarks_child: 'Existing Record',
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
            
            let intParamFileId = objReduceValues.paramFileId
            let strTransKey = objReduceValues.transKey
            let arrToProcess = objReduceValues.toProcess
            let arrSkippedLines = objReduceValues.skippedLines

            log.debug('reduce arrToProcess', arrToProcess);
            log.debug('reduce arrSkippedLines', arrSkippedLines);

            if(arrToProcess.length > 0){

                let parentRecId = createEPIParent(objReduceValues)

                if (parentRecId){
                    const CHUNK_SIZE = 40;

                    if (arrToProcess.length > CHUNK_SIZE) {
                        let chunks = splitArrayIntoChunks(arrToProcess, CHUNK_SIZE);
                        
                        for (let i = 0; i < chunks.length; i++) {
                            let chunk = chunks[i];
                            chunk.forEach(data => {
                                data.custpage_epia0f11_trans_key_child = strTransKey
                                data.custpage_epia0f11_remarks_child = 'Newly Created'
                                data.custpage_epia0f11_parent_rec_id = parentRecId
                                data.custpage_epia0f11_date_range_child = arrToProcess[0].custpage_epia0f11_date_range
                            });

                            log.debug('length', chunk.length)
                            log.debug('chunk', chunk)

                            let fileId = createFileLogs(chunk, i)

                            if (fileId){
                                try {
                                    let slResponse = https.requestSuitelet({
                                        scriptId: "customscript_process_epia0f11_sl",
                                        deploymentId: "customdeploy_process_epia0f11_sl",
                                        urlParams: {
                                            data: fileId
                                        }
                                    });
                                    log.debug('rawResponseBody', slResponse);
                                } catch (error) {
                                    log.error('error', error.message)
                                }
                            }
                        }

                    } else {
                        arrToProcess.forEach(data => {
                            data.custpage_epia0f11_trans_key_child = strTransKey
                            data.custpage_epia0f11_remarks_child = 'Newly Created'
                            data.custpage_epia0f11_parent_rec_id = parentRecId
                            data.custpage_epia0f11_date_range_child = arrToProcess[0].custpage_epia0f11_date_range
                        });

                        let fileId = createFileLogs(arrToProcess, 0)

                        if (fileId){

                            try {
                                let slResponse = https.requestSuitelet({
                                    scriptId: "customscript_process_epia0f11_sl",
                                    deploymentId: "customdeploy_process_epia0f11_sl",
                                    urlParams: {
                                        data: fileId
                                    }
                                });
                                log.debug('rawResponseBody', slResponse);  
                            } catch (error) {
                                log.error('error', error.message)
                            }

                        }
                    }
                }

            } 

            deleteParamFile(intParamFileId)
        }

        const summarize = (summaryContext) => {

        }

        //Private 

        const createFileLogs = (arrLogs, index) => {
            let logId = null
            log.debug('createFileLogs arrLogs', arrLogs)
            try {
                let fileName = `paramChunkEmployeeData_${index}.json`;
    
                let fileObj = file.create({
                    name: fileName,
                    fileType: file.Type.JSON,
                    contents: JSON.stringify(arrLogs)
                });
    
                fileObj.folder = 1493; // NSI TC > Export_CSV > Employee Template > Parameter Employee Data > Parameter Chunk Employee Data
    
                logId = fileObj.save();
                log.debug('createFileLogs logId', logId)
            } catch (error) {
                log.error('createFileLogs error', error.message)
            }
            return logId
        }


        const splitArrayIntoChunks = (array, chunkSize)  => { 
            let result = [];
            for (let i = 0; i < array.length; i += chunkSize) {
                result.push(array.slice(i, i + chunkSize));
            }
            return result;
        }

        const createEPIParent = (objReduceValues) => {
            let recordId = null
            try {
                let total_Reg_Earnings = 0
                let total_OT_Earnings = 0
                let total_STH = 0
                let total_S15 = 0
                let total_SCK = 0
                let total_EXP = 0
                let total_VAC = 0

                let arrToProcess = objReduceValues.toProcess
                let arrSkippedLines = objReduceValues.skippedLines
                let tranKey = objReduceValues.transKey

                arrSkippedLines.forEach(data => {
                    let arrLineValue = data.lineValue
                    arrToProcess = [...arrToProcess, ...arrLineValue]
                    
                });

                arrToProcess.forEach(element => {
                    let amountReg = element.custpage_epia0f11_reg_earn_08 ? parseFloat(element.custpage_epia0f11_reg_earn_08) : 0
                    let amountOT = element.custpage_epia0f11_ot_earn_10 ? parseFloat(element.custpage_epia0f11_ot_earn_10) : 0
                    let amountSTH = element.custpage_epia0f11_earn_amt_sth_col_14 ? parseFloat(element.custpage_epia0f11_earn_amt_sth_col_14) : 0
                    let amountS15 = element.custpage_epia0f11_earn_amt_s15_col_18 ? parseFloat(element.custpage_epia0f11_earn_amt_s15_col_18) : 0
                    let amountSCK = element.custpage_epia0f11_earn_amt_sck_col_22 ? parseFloat(element.custpage_epia0f11_earn_amt_sck_col_22) : 0
                    let amountEXP = element.custpage_epia0f11_earn_amt_exp_col_26 ? parseFloat(element.custpage_epia0f11_earn_amt_exp_col_26) : 0
                    let amountVAC = element.custpage_epia0f11_earn_amt_vac_col_28 ? parseFloat(element.custpage_epia0f11_earn_amt_vac_col_28) : 0

                    total_Reg_Earnings = total_Reg_Earnings + amountReg
                    total_OT_Earnings = total_OT_Earnings + amountOT
                    total_STH = total_STH + amountSTH
                    total_S15 = total_S15 + amountS15
                    total_SCK = total_SCK + amountSCK
                    total_EXP = total_EXP + amountEXP
                    total_VAC = total_VAC + amountVAC
                });

                let objRecData = record.create({
                    type: 'customrecord_epia0f11_parent',
                    isDynamic: true
                })

                objRecData.setValue({
                    fieldId: 'custrecord_epia0f11_batch_id',
                    value: arrToProcess[0].custpage_epia0f11_batch_id_col_02
                })

                objRecData.setValue({
                    fieldId: 'custrecord_epia0f11_date_range',
                    value: arrToProcess[0].custpage_epia0f11_date_range
                })

                objRecData.setValue({
                    fieldId: 'custrecord_total_reg_earning',
                    value: total_Reg_Earnings
                })

                objRecData.setValue({
                    fieldId: 'custrecord_total_ot_earning',
                    value: total_OT_Earnings
                })

                objRecData.setValue({
                    fieldId: 'custrecord_total_earning_sth',
                    value: total_STH
                })

                objRecData.setValue({
                    fieldId: 'custrecord_total_earning_s15',
                    value: total_S15
                })

                objRecData.setValue({
                    fieldId: 'custrecord_total_earning_sck',
                    value: total_SCK
                })

                objRecData.setValue({
                    fieldId: 'custrecord_total_earning_exp',
                    value: total_EXP
                })

                objRecData.setValue({
                    fieldId: 'custrecord_total_earning_vac',
                    value: total_VAC
                })

                objRecData.setValue({
                    fieldId: 'custrecord_epia0f11_trans_key',
                    value: tranKey
                })

                objRecData.setValue({
                    fieldId: 'custrecord_epia0f11_remarks',
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
                        'AND',
                        ['employeestatus', 'anyof', '10'],
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
                    type: 'customrecord_epia0f11_child',
                    filters: [
                        ['custrecord_epia0f11_parent_rec_id', 'anyof', id],
                    ],
                    columns: [
                        search.createColumn({ name: 'internalid', sort: search.Sort.ASC }),
                        search.createColumn({ name: 'custrecord_epia0f11_co_code_col_01' }),
                        search.createColumn({ name: 'custrecord_epia0f11_batch_id_col_02' }),
                        search.createColumn({ name: 'custrecord_epia0f11_file_no_03' }),
                        search.createColumn({ name: 'custrecord_epia0f11_tax_freq_col_04' }),
                        search.createColumn({ name: 'custrecord_epia0f11_temp_dept_col_05' }),
                        search.createColumn({ name: 'custrecord_epia0f11_temp_rate_col_06' }),
                        search.createColumn({ name: 'custrecord_epia0f11_reg_hours_col_07' }),
                        search.createColumn({ name: 'custrecord_epia0f11_reg_earn_08' }),
                        search.createColumn({ name: 'custrecord_epia0f11_ot_hours_col_09' }),
                        search.createColumn({ name: 'custrecord_epia0f11_ot_earn_10' }),
                        search.createColumn({ name: 'custrecord_epia0f11_hour_code_sth_col_11' }),
                        search.createColumn({ name: 'custrecord_epia0f11_hour_amt_sth_col_12' }),
                        search.createColumn({ name: 'custrecord_epia0f11_earn_code_sth_col_13' }),
                        search.createColumn({ name: 'custrecord_epia0f11_earn_amt_sth_col_14' }),
                        search.createColumn({ name: 'custrecord_epia0f11_hour_code_s15_col_15' }),
                        search.createColumn({ name: 'custrecord_epia0f11_hour_amt_s15_col_16' }),
                        search.createColumn({ name: 'custrecord_epia0f11_earn_code_s15_col_17' }),
                        search.createColumn({ name: 'custrecord_epia0f11_earn_amt_s15_col_18' }),
                        search.createColumn({ name: 'custrecord_epia0f11_hour_code_sck_col_19' }),
                        search.createColumn({ name: 'custrecord_epia0f11_hour_amt_sck_col_20' }),
                        search.createColumn({ name: 'custrecord_epia0f11_earn_code_sck_col_21' }),
                        search.createColumn({ name: 'custrecord_epia0f11_earn_amt_sck_col_22' }),
                        search.createColumn({ name: 'custrecord_epia0f11_hour_code_exp_col_23' }),
                        search.createColumn({ name: 'custrecord_epia0f11_hour_amt_exp_col_24' }),
                        search.createColumn({ name: 'custrecord_epia0f11_earn_code_exp_col_25' }),
                        search.createColumn({ name: 'custrecord_epia0f11_earn_amt_exp_col_26' }),
                        search.createColumn({ name: 'custrecord_epia0f11_earn_code_vac_col_27' }),
                        search.createColumn({ name: 'custrecord_epia0f11_earn_amt_vac_col_28' }),
                        search.createColumn({ name: 'custrecord_epia0f11_date_range_child' }),
                        search.createColumn({ name: 'custrecord_epia0f11_parent_rec_id' }),
                        search.createColumn({ name: 'custrecord_epia0f11_trans_key_child' }),
                        search.createColumn({ name: 'custrecord_epia0f11_remarks_child' }),
                        search.createColumn({ name: 'custrecord_epia0f11_employee' }),


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
                                    parentId: pageData[pageResultIndex].getValue({ name: 'custrecord_epia0f11_parent_rec_id' }),

                                    epia0f11_co_code_col_01: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_co_code_col_01'}),
                                    epia0f11_batch_id_col_02: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_batch_id_col_02'}),
                                    epia0f11_file_no_03: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_file_no_03'}),
                                    epia0f11_tax_freq_col_04: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_tax_freq_col_04'}),
                                    epia0f11_temp_dept_col_05: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_temp_dept_col_05'}),
                                    epia0f11_temp_rate_col_06: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_temp_rate_col_06'}),
                                    epia0f11_reg_hours_col_07: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_reg_hours_col_07'}),
                                    epia0f11_reg_earn_08: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_reg_earn_08'}),
                                    epia0f11_ot_hours_col_09: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_ot_hours_col_09'}),
                                    epia0f11_ot_earn_10: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_ot_earn_10'}),
                                    epia0f11_hour_code_sth_col_11: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_hour_code_sth_col_11'}),
                                    epia0f11_hour_amt_sth_col_12: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_hour_amt_sth_col_12'}),
                                    epia0f11_earn_code_sth_col_13: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_earn_code_sth_col_13'}),
                                    epia0f11_earn_amt_sth_col_14: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_earn_amt_sth_col_14'}),
                                    epia0f11_hour_code_s15_col_15: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_hour_code_s15_col_15'}),
                                    epia0f11_hour_amt_s15_col_16: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_hour_amt_s15_col_16'}),
                                    epia0f11_earn_code_s15_col_17: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_earn_code_s15_col_17'}),
                                    epia0f11_earn_amt_s15_col_18: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_earn_amt_s15_col_18'}),
                                    epia0f11_hour_code_sck_col_19: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_hour_code_sck_col_19'}),
                                    epia0f11_hour_amt_sck_col_20: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_hour_amt_sck_col_20'}),
                                    epia0f11_earn_code_sck_col_21: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_earn_code_sck_col_21'}),
                                    epia0f11_earn_amt_sck_col_22: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_earn_amt_sck_col_22'}),
                                    epia0f11_hour_code_exp_col_23: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_hour_code_exp_col_23'}),
                                    epia0f11_hour_amt_exp_col_24: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_hour_amt_exp_col_24'}),
                                    epia0f11_earn_code_exp_col_25: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_earn_code_exp_col_25'}),
                                    epia0f11_earn_amt_exp_col_26: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_earn_amt_exp_col_26'}),
                                    epia0f11_earn_code_vac_col_27: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_earn_code_vac_col_27'}),
                                    epia0f11_earn_amt_vac_col_28: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_earn_amt_vac_col_28'}),

                                    transaction_keys: pageData[pageResultIndex].getValue({ name: 'custrecord_epia0f11_trans_key_child' }),
                                    dateRange: pageData[pageResultIndex].getValue({ name: 'custrecord_epia0f11_date_range_child' }),
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
                    type: 'customrecord_epia0f11_parent',
                    filters: [],
                    columns: [
                        search.createColumn({ name: 'internalid', sort: search.Sort.ASC }),
                        search.createColumn({ name: 'custrecord_epia0f11_batch_id' }),
                        search.createColumn({ name: 'custrecord_epia0f11_date_range' }),
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
                                    batchId: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_batch_id'}),
                                    dateRange: pageData[pageResultIndex].getValue({name: 'custrecord_epia0f11_date_range'}),
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

        const deleteParamFile = (fileId)  => { 
            try {
                file.delete({ id: fileId });
                log.debug('File Deleted', `File with ID ${fileId} was successfully deleted.`);
            } catch (e) {
                log.error('File Deletion Error', `Failed to delete file with ID ${fileId}: ${e.message}`);
            }
        }

        return {getInputData, map, reduce, summarize}

    });
