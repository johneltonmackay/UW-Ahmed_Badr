/**
 * @NAPIVersion 2.1
 */
define(["N/ui/serverWidget", "N/search", "N/task", "N/file", "N/record", "../Library/csv_export_sl_mapping.js", 'N/runtime', 'N/url', 'N/ui/message', 'N/format', 'N/currentRecord'],

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
                    arrSearchResults.forEach((data, index) => {
                        for (const key in data) {
                            let value = data[key];
                            if (value !== undefined && value !== null && value !== ''){
                                sublist.setSublistValue({
                                    id: key,
                                    line: index,
                                    value: value,
                                }); 
                            }
                        }
                    });
                }
            } catch (err) {
                log.error("BUILD_FORM_ADD_SUBLIST_ERROR", err.message);
            }
        }

        const runSearch = (arrParam) => {
            log.debug('runSearch arrParam', arrParam)
            try {
                let arrNewParam = JSON.parse(arrParam)
                log.debug('runSearch arrNewParam', arrNewParam)
                let intBatchId = arrNewParam[0].custpage_batch_id;
                log.debug('runSearch intBatchId', intBatchId);
                
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
                        ['employeestatus', 'anyof', '9'], // Contractor- FT
                        'AND',
                        ['laborcost', 'isnotempty', ''],
                        'AND',
                        ['custentity_adp_file_number', 'isnotempty', ''],
                        'AND',
                        ['custentity_adp_group_code', 'isnotempty', ''],
                        'AND',
                        ['isinactive', 'is', 'F'],
                    ],
                    columns: [
                        search.createColumn({ name: 'altname', label: 'custpage_emp_name' }),
                        search.createColumn({ name: 'laborcost', label: 'custpage_labor_cost' }),
                        search.createColumn({ name: 'custentity_adp_file_number', label: 'custpage_file_no_col_03' }),
                        search.createColumn({ name: 'custentity_adp_group_code', label: 'custpage_co_code_col_01' }),
                        search.createColumn({ name: 'internalid', label: 'custpage_emp_internalid' }),
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
   
                                let custpage_earn_5_amount_col_07 = timeTotal * objData.custpage_labor_cost;
                                let custpage_earn_5_amount_col_09 =  0.13 * custpage_earn_5_amount_col_07
                                objData.custpage_batch_id_col_02 = intBatchId;
                                objData.custpage_earn_5_code_col_06 = 'FEE';
                                objData.custpage_earn_5_amount_col_07 = custpage_earn_5_amount_col_07 ? custpage_earn_5_amount_col_07 : 0;
                                objData.custpage_earn_5_code_col_08 = 'HST'
                                objData.custpage_earn_5_amount_col_09 = custpage_earn_5_amount_col_09 ? custpage_earn_5_amount_col_09 : 0
                                objData.custpage_dtFrom = dtFrom;
                                objData.custpage_dtTo = dtTo;
                                arrSearchResults.push(objData);
                            }
                        }   
                    }
                }
            log.debug(`runSearch arrSearchResults ${Object.keys(arrSearchResults).length}`, arrSearchResults);

            let arrValidatedEmp = filterSearch(arrSearchResults)
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
        
                if (dtRelease) {
                    let parseDateFrom = formatISODate(dtDateFrom);
                    log.debug('parseDateFrom', parseDateFrom)
                    
                    let parseDateTo = formatISODate(dtDateTo);
                    log.debug('parseDateTo', parseDateTo)

                    let parsedRelease = formatISODate(dtRelease);
                    log.debug('dtRelease', dtRelease)
                    
                    if (parsedRelease >= parseDateFrom && parsedRelease <= parseDateTo) {
                        data.reason = 'parsedRelease within Date Range';
                        arrFilterOutEmp.push(data);
                    } else if (parseDateFrom >= parsedRelease && parseDateTo >= parsedRelease){
                        data.reason = 'Date Range greater than parsedRelease';
                        arrFilterOutEmp.push(data);
                    } else {
                        arrValidatedEmp.push(data);
                    }
                } else {
                    arrValidatedEmp.push(data);
                }

            });
        
            log.debug('filterSearch arrFilterOutEmp', arrFilterOutEmp);
            return arrValidatedEmp;
        };
        
        const runTimeSearch = (paramDtFrom, paramDtTo, empId) => {
            try {
                let dtFrom = convertDateFormat(paramDtFrom)
                let dtTo = convertDateFormat(paramDtTo)
                log.debug('date', dtFrom + " " + dtTo)
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
            log.debug(`runTimeSearch arrSearchResults ${Object.keys(arrSearchResults).length}`, arrSearchResults);

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
