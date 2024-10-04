/**
 * @NAPIVersion 2.1
 */
define(["N/ui/serverWidget", "N/search", "N/task", "N/file", "N/record", "../Library/epia0f11_csv_export_sl_mapping.js", 'N/runtime', 'N/url', 'N/ui/message', 'N/format', 'N/currentRecord'],

    (serverWidget, search, task, file, record, slMapping, runtime, url, message, format, currentRecord) => {

        //#constants
        const FORM = {};
        const ACTIONS = {};

        //#global functions
        FORM.buildForm = (options) => {
            try {
                var objForm = serverWidget.createForm({
                    title: options.title,
                });
                log.debug('buildForm options', options)
                addButtons({
                    form: objForm,
                });
                addFields({
                    form: objForm
                });
                addSublistFields({
                    form: objForm,  
                    parameters: options.dataParam
                });

                objForm.clientScriptModulePath = slMapping.SUITELET.form.CS_PATH;

                return objForm;
            } catch (err) {
                log.error('ERROR_BUILD_FORM:', err.message)
            }
        }

        const addButtons = (options) => {
            try {
                options.form.addSubmitButton({
                    label: slMapping.SUITELET.form.buttons.SUBMIT.label,
                });

                for (let strBtnKey in slMapping.SUITELET.form.buttons) {
                    if (slMapping.SUITELET.form.buttons[strBtnKey].id) {
                        options.form.addButton(slMapping.SUITELET.form.buttons[strBtnKey])
                    }

                }

            } catch (err) {
                log.error("BUILD_FORM_ADD_BUTTONS_ERROR", err.message);
            }
        };

        const addFields = (options) => {
            try {
                for (var strKey in slMapping.SUITELET.form.fields) {
                    options.form.addField(slMapping.SUITELET.form.fields[strKey]);
                    var objField = options.form.getField({
                        id: slMapping.SUITELET.form.fields[strKey].id,
                        container: 'custpage_fieldgroup'
                    });
                    if (slMapping.SUITELET.form.fields[strKey].ismandatory) {
                        objField.isMandatory = true;
                    }
                    if (slMapping.SUITELET.form.fields[strKey].ishidden) {
                        objField.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.HIDDEN
                        });
                    }
                    if (slMapping.SUITELET.form.fields[strKey].hasoption) {
                        for (var strKey in slMapping.SUITELET.form.selectOptions) {
                            objField.addSelectOption(slMapping.SUITELET.form.selectOptions[strKey]);
                        }
                    }
                }
            } catch (err) {
                log.error("BUILD_FORM_ADD_BODY_FILTERS_ERROR", err.message);
            }
        };

        const addSublistFields = (options) => {
            try {
                let newData = []
                let sublist = options.form.addSublist({
                    id : 'custpage_sublist',
					type : serverWidget.SublistType.LIST,
					label : 'Preview Results',
					tab: 'custpage_tabid'
                });
                for (var strKey in slMapping.SUITELET.form.sublistfields) {
                    sublist.addField(slMapping.SUITELET.form.sublistfields[strKey]);
                }

                let arrParam = options.parameters
                log.debug('addSublistFields arrParam', arrParam);
                if (arrParam){
                    let arrSearchResults = runSearch(arrParam)
                    let arrTaskData = searchTaskId(arrParam)
                    arrSearchResults.forEach((data, index) => {
                        let empId = data.custrecord_epia0f11_employee
                        let empLaborCost = data.custpage_labor_cost

                        let objSTHData = getTimeBill(empId, arrTaskData, empLaborCost , 'STAT')
                        data.custpage_epia0f11_hour_amt_sth_col_12 = objSTHData.intHours ? objSTHData.intHours : 0
                        data.custpage_epia0f11_earn_amt_sth_col_14 = objSTHData.intAmount ? objSTHData.intAmount : 0

                        let objS15Data = getTimeBill(empId, arrTaskData, empLaborCost , 'S15')
                        data.custpage_epia0f11_hour_code_s15_col_15 = objS15Data.intHours ? 'S15' : null
                        data.custpage_epia0f11_earn_code_s15_col_17 = objS15Data.intHours ? 'S15' : null
                        data.custpage_epia0f11_hour_amt_s15_col_16 = objS15Data.intHours ? objS15Data.intHours : null
                        data.custpage_epia0f11_earn_amt_s15_col_18 = objS15Data.intAmount ? objS15Data.intAmount : null

                        let objSCKData = getTimeBill(empId, arrTaskData, empLaborCost , 'SICK')
                        data.custpage_epia0f11_hour_code_sck_col_19 = objSCKData.intHours ? 'SCK' : null
                        data.custpage_epia0f11_earn_code_sck_col_21 = objSCKData.intHours ? 'SCK' : null
                        data.custpage_epia0f11_hour_amt_sck_col_20 = objSCKData.intHours ? objSCKData.intHours : null
                        data.custpage_epia0f11_earn_amt_sck_col_22 = objSCKData.intAmount ? objSCKData.intAmount : null

                        let objEXPData = getTimeBill(empId, arrTaskData, empLaborCost , 'EXP')
                        data.custpage_epia0f11_earn_code_exp_col_23 = objEXPData.intHours ? 'EXP' : null
                        data.custpage_epia0f11_earn_code_exp_col_25 = objEXPData.intHours ? 'EXP' : null
                        data.custpage_epia0f11_earn_amt_exp_col_24 = objEXPData.intHours ? objEXPData.intHours : null
                        data.custpage_epia0f11_earn_amt_exp_col_26 = objEXPData.intAmount ? objEXPData.intAmount : null

                        let objVACData = getTimeBill(empId, arrTaskData, empLaborCost , 'VACATION')
                        data.custpage_epia0f11_earn_code_vac_col_27 = objVACData.intHours ? 'VAC' : null
                        data.custpage_epia0f11_earn_amt_vac_col_28 = objVACData.intAmount ? objVACData.intAmount : null
                        
                        newData.push(data)

                        for (const key in data) {
                            if (key != 'custpage_date_range'){
                                let value = data[key];
                                if (value !== undefined && value !== null && value !== ''){
                                    sublist.setSublistValue({
                                        id: key,
                                        line: index,
                                        value: value,
                                    }); 
                                }
                            }
                        }
                    });

                    if (newData && newData.length > 0) {
                        log.debug('newData.length', newData.length)
                        let fileID = createFileLogs(JSON.stringify(newData));
                        var objField = options.form.getField({
                            id: 'custpage_epi_data',
                            container: 'custpage_fieldgroup'
                        });
                        objField.defaultValue = fileID
                    }
                }
            } catch (err) {
                log.error("BUILD_FORM_ADD_SUBLIST_ERROR", err.message);
            }
        }

        const getTimeBill = (empId, arrTaskData, empLaborCost, chargeCode) => {
            let intHours = 0;
            let objTimeBillData = {};
            const arrFilteredTask = arrTaskData.filter(item =>
                item.empId == empId && item.chargeCode.includes(chargeCode)
            );
            // log.debug('getTimeBill arrFilteredTask', arrFilteredTask)

            arrFilteredTask.forEach(data => {
                intHours += timeToFloat(data.hours)
            });

            if (arrFilteredTask.length > 0 ){
                objTimeBillData = {
                    chargeCode: chargeCode,
                    intHours: intHours,
                    intAmount: intHours * empLaborCost
                }
    
                log.debug('getTimeBill objTimeBillData', objTimeBillData)
            }
            return objTimeBillData
        }

        const createFileLogs = (arrLogs) => {
            log.debug('createFileLogs arrLogs', arrLogs)
            let today = new Date();
            let fileName = 'paramEmployeeData.json';

            let fileObj = file.create({
                name: fileName,
                fileType: file.Type.JSON,
                contents: arrLogs
            });

            fileObj.folder = 1492; // NSI TC > Export_CSV > Employee Template > Parameter Employee Data

            let logId = fileObj.save();
            log.debug('createFileLogs logId', logId)

            return logId
        }

        const runSearch = (arrParam) => {
            log.debug('runSearch arrParam', arrParam)
            try {
                let arrNewParam = JSON.parse(arrParam)
                log.debug('runSearch arrNewParam', arrNewParam)
                let intBatchId = arrNewParam[0].custpage_batch_id;
                log.debug('runSearch intBatchId', intBatchId);

                let intDateId = arrNewParam[0].intDateRange;

                let dateRange = arrNewParam[0].custpage_date_range;
                log.debug('runSearch custpage_date_range', dateRange);
                
                let rawDate = dateRange.split(' - ');
                let dtFrom = rawDate[0].trim(); 
                let dtTo = rawDate[1].trim(); 
                
                log.debug('Parsed Start Date:', dtFrom);
                log.debug('Parsed End Date:', dtTo);
                let arrSearchResults = []
                let objSavedSearch = search.create({
                    type: 'employee',
                    filters: [
                        ['employeestatus', 'anyof', '10'], // Employee- FT
                        'AND',
                        ['custentity_nsi_labor_cost', 'isnotempty', ''],
                        'AND',
                        ['custentity_adp_file_number', 'isnotempty', ''],
                        'AND',
                        ['custentity_adp_co_code', 'isnotempty', ''],
                        'AND',
                        ['isinactive', 'is', 'F'],
                    ],
                    columns: [
                        search.createColumn({ name: 'altname', label: 'custpage_emp_name' }),
                        search.createColumn({ name: 'custentity_nsi_labor_cost', label: 'custpage_labor_cost' }),
                        search.createColumn({ name: 'custentity_adp_file_number', label: 'custpage_epia0f11_file_no_03' }),
                        search.createColumn({ name: 'custentity_adp_co_code', label: 'custpage_epia0f11_co_code_col_01' }),
                        search.createColumn({ name: 'internalid', label: 'custrecord_epia0f11_employee' }),
                        search.createColumn({ name: 'hiredate', label: 'custpage_emp_hired_date' }),
                        search.createColumn({ name: 'releasedate', label: 'custpage_emp_release_date' }),
                    ],

                });

                let searchResultCount = objSavedSearch.runPaged().count;
            
                if (searchResultCount !== 0) {
                    let pagedData = objSavedSearch.runPaged({ pageSize: 1000 });
            
                    for (let i = 0; i < pagedData.pageRanges.length; i++) {
                        let currentPage = pagedData.fetch(i);
                        let pageData = currentPage.data;
                        var pageColumns = currentPage.data[0].columns;
                        if (pageData.length > 0) {
                            for (let pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                                let objData = {};
                                let timeTotal = 0
                                pageColumns.forEach(function (result) {
                                    let resultLabel = result.label;
                                    if(resultLabel == 'custpage_emp_internalid'){
                                        let empId = pageData[pageResultIndex].getValue(result);
                                        timeTotal = runTimeSearch(dtFrom, dtTo, empId)
                                        objData[resultLabel] = pageData[pageResultIndex].getValue(result)
                                    } else if (resultLabel == 'custpage_emp_hired_date' || resultLabel == 'custpage_emp_release_date'){
                                        let rawDate = pageData[pageResultIndex].getValue(result);
                                        if (rawDate){
                                            objData[resultLabel] = convertDateFormat(rawDate)
                                        } else {
                                            objData[resultLabel] = null
                                        }
                                    } else {
                                      objData[resultLabel] = pageData[pageResultIndex].getValue(result);
                                    }
                                })

                                objData.custpage_epia0f11_reg_hours_col_07 = timeTotal;
                                objData.custpage_epia0f11_reg_earn_08 = timeTotal * objData.custpage_labor_cost;
                                objData.custpage_epia0f11_ot_hours_col_09 = 0 // Need to confirm OT Hours
                                objData.custpage_epia0f11_ot_earn_10 = 0 // Need to confirm OT Hours
                                objData.custpage_epia0f11_hour_code_sth_col_11 = 'STH'
                                objData.custpage_epia0f11_earn_code_sth_col_13 = 'STH'


                                objData.custpage_epia0f11_batch_id_col_02 = intBatchId;
                                objData.custpage_dtFrom = dtFrom;
                                objData.custpage_dtTo = dtTo;
                                objData.custpage_epia0f11_date_range = intDateId;
                                arrSearchResults.push(objData);
                            }
                        }   
                    }
                }
            log.debug(`runSearch arrSearchResults ${Object.keys(arrSearchResults).length}`, arrSearchResults);

            let arrValidatedEmp = filterSearch(arrSearchResults)
            log.debug('runSearch arrValidatedEmp.length', arrValidatedEmp.length)
            log.debug('runSearch arrValidatedEmp', arrValidatedEmp)
            return arrValidatedEmp;

            } catch (err) {
                log.error('Error: runSearch', err.message);
            }
        }

        const filterSearch = (arrSearchResults) => {
            let arrValidatedEmp = [];
            let arrFilterOutEmp = [];
        
            arrSearchResults.forEach(data => {
                let dtRelease = data.custpage_emp_release_date;
                let dtHired = data.custpage_emp_hired_date;
                let dtDateFrom = data.custpage_dtFrom
                let dtDateTo = data.custpage_dtTo

                let parseDateFrom = formatISODate(dtDateFrom);
                // log.debug('parseDateFrom', parseDateFrom)
                
                let parseDateTo = formatISODate(dtDateTo);
                // log.debug('parseDateTo', parseDateTo)
        
                if (dtRelease) {

                    let parsedRelease = formatISODate(dtRelease);
                    // log.debug('dtRelease', dtRelease)
                    
                    if (parsedRelease >= parseDateFrom && parsedRelease <= parseDateTo) {
                        arrValidatedEmp.push(data);
                    } else if (parseDateFrom >= parsedRelease){
                        data.reason = 'From Date Range is greater than or equal to Release Date';
                        arrFilterOutEmp.push(data);
                    } else {
                        arrValidatedEmp.push(data);
                    }
                } else {

                    let parsedHired = formatISODate(dtHired);
                    // log.debug('dtHired', dtHired)
                    
                    if (parsedHired >= parseDateFrom && parsedHired <= parseDateTo) {
                        arrValidatedEmp.push(data);
                    } else if (parseDateFrom >= parsedHired){
                        arrValidatedEmp.push(data);
                    } else {
                        data.reason = 'Hired Date is Out of Date Ranged';
                        arrFilterOutEmp.push(data);
                    }
                }

            });
        
            log.debug('filterSearch arrFilterOutEmp', arrFilterOutEmp);
            return arrValidatedEmp;
        };
        
        const searchTaskId = (arrParam) => {
            let arrNewParam = JSON.parse(arrParam)
            log.debug('searchTaskId arrNewParam', arrNewParam)
            
            let dateRange = arrNewParam[0].custpage_date_range;
            log.debug('searchTaskId custpage_date_range', dateRange);
            
            let rawDate = dateRange.split(' - ');
            let paramDtFrom = rawDate[0].trim(); 
            let paramDtTo = rawDate[1].trim(); 

            let dtFrom = convertDateFormat(paramDtFrom)
            let dtTo = convertDateFormat(paramDtTo)
            
            log.debug('searchTaskId Parsed Start Date:', dtFrom);
            log.debug('searchTaskId Parsed End Date:', dtTo);
            let arrTaskId = [];
            try {
                let objSearch = search.create({
                    type: 'projecttask',
                    filters: [
                        ['custevent_chargecode', 'isnotempty', ''],
                        'AND',
                        ['time.casetaskevent', 'noneof', '@NONE@'],
                        'AND',
                        ['time.date', 'within', dtFrom, dtTo],
                        'AND',
                        ['time.duration', 'greaterthanorequalto', '1'],
                        // 'AND',
                        // ['time.employee', 'anyof', empId],
                    ],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                        search.createColumn({ name: 'casetaskevent', join: 'time' }),
                        search.createColumn({ name: 'customer', join: 'time' }),
                        search.createColumn({ name: 'hours', join: 'time' }),
                        search.createColumn({ name: 'employee', join: 'time' }),
                        search.createColumn({ name: 'custevent_chargecode' }),
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
                                arrTaskId.push({
                                    taskId: pageData[pageResultIndex].getValue({name: 'internalid'}),
                                    caseId: pageData[pageResultIndex].getValue({ name: 'casetaskevent', join: 'time' }),
                                    customerId: pageData[pageResultIndex].getValue({ name: 'customer', join: 'time' }),
                                    hours: pageData[pageResultIndex].getValue({ name: 'hours', join: 'time' }),
                                    empId: pageData[pageResultIndex].getValue({ name: 'employee', join: 'time' }),
                                    chargeCode: pageData[pageResultIndex].getValue({ name: 'custevent_chargecode' }),
                                });
                            }
                        }
                    }
                }
                log.debug(`searchTaskId arrTaskId ${Object.keys(arrTaskId).length}`, arrTaskId);
            } catch (err) {
                log.error('searchTaskId', err);
            }
            // log.debug("searchTaskId: arrTaskId", arrTaskId)
            return arrTaskId;
        }

        const runTimeSearch = (paramDtFrom, paramDtTo, empId) => {
            try {
                let dtFrom = convertDateFormat(paramDtFrom)
                let dtTo = convertDateFormat(paramDtTo)
                // log.debug('date', dtFrom + " " + dtTo)
                let intTotal = 0
                let arrSearchResults = []
                let objSavedSearch = search.create({
                    type: 'timebill',
                    filters: [
                        ['duration', 'greaterthanorequalto', '1'],
                        'AND',
                        ['date', 'within', dtFrom, dtTo],
                        'AND',
                        ['employee.internalid', 'anyof', empId],
                        'AND',
                        ['employee.employeestatus', 'anyof', '10'],
                        'AND',
                        ['projecttask.custevent_chargecode', 'doesnotcontain', 'SICK'],
                        'AND',
                        ['projecttask.custevent_chargecode', 'doesnotcontain', 'VACATION'],
                        'AND',
                        ['projecttask.custevent_chargecode', 'doesnotcontain', 'STH'],
                        'AND',
                        ['projecttask.custevent_chargecode', 'doesnotcontain', 'S15'],
                        'AND',
                        ['projecttask.custevent_chargecode', 'doesnotcontain', 'EXP'],
                    ],
                    columns: [
                        search.createColumn({ name: 'hours', label: 'intDuration'}),
                    ],

                });

                let searchResultCount = objSavedSearch.runPaged().count;
            
                if (searchResultCount !== 0) {
                    let pagedData = objSavedSearch.runPaged({ pageSize: 1000 });
            
                    for (let i = 0; i < pagedData.pageRanges.length; i++) {
                        let currentPage = pagedData.fetch(i);
                        let pageData = currentPage.data;
                        var pageColumns = currentPage.data[0].columns;
                        if (pageData.length > 0) {
                            for (let pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {

                                let rawTime = 0;
                                pageColumns.forEach(function (result) {
                                    let value = pageData[pageResultIndex].getValue(result);
                                    if (value) {
                                        rawTime = timeToFloat(value);
                                    } 
                                });
                                arrSearchResults.push(rawTime);
                            }
                        }   
                    }
                }
            // log.debug(`runTimeSearch arrSearchResults ${Object.keys(arrSearchResults).length}`, arrSearchResults);

            arrSearchResults.forEach(data => {
                intTotal += data
            });

            return intTotal;

            } catch (err) {
                log.error('Error: runTimeSearch', err.message);
            }
        }

        const timeToFloat = (timeString) => {
            // Split the time string into hours and minutes
            const [hoursStr, minutesStr] = timeString.split(':');
                    
            // Convert hours and minutes to numbers
            const hours = parseInt(hoursStr, 10);
            const minutes = parseInt(minutesStr, 10);

            // Calculate the float representation
            const floatTime = hours + (minutes / 60);

            return floatTime;
        }

        const convertDateFormat = (dateString) => {
            const [day, month, year] = dateString.split('/');
            return `${month}/${day}/${year}`;
        }

        const formatISODate = (strDate) => {

            const parts = strDate.split('/');

            // Extract day, month, and year from the split parts
            const day = parts[0];
            const month = parts[1];
            const year = parts[2];

            // Create a new Date object with the extracted values (month - 1 because JavaScript months are zero-indexed)
            const dateObj = new Date(year, month - 1, day);

            // Format the date in ISO 8601 format
            const isoDateString = dateObj.toISOString();
        
            return isoDateString;
        }


        return { FORM, ACTIONS }
    });
