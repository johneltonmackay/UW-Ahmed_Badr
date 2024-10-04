/**
 * @NAPIVersion 2.1
 */
define(["N/ui/serverWidget", "N/search", "N/task", "N/file", "N/record", "../Library/epia0f11_create_epi_sl_mapping.js", 'N/runtime', 'N/url', 'N/ui/message', 'N/format'],

    (serverWidget, search, task, file, record, slMapping, runtime, url, message, format) => {

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
                let parsedParam = JSON.parse(options.dataParam)
                let paramEPIData = parsedParam.taskId
                let paramTaskKey = parsedParam.transKey
                let paramTaskId = parsedParam.taskId
                log.debug('buildForm paramEPIData', paramEPIData)

                addFields({
                    form: objForm,
                    epiData: paramEPIData,
                    transkey: paramTaskKey,
                    taskId: paramTaskId
                });

                statusChecker(paramTaskId, objForm)

                objForm.clientScriptModulePath = slMapping.SUITELET.form.CS_PATH;

                return objForm;
            } catch (err) {
                log.error('ERROR_BUILD_FORM:', err.message)
            }
        }

        ACTIONS.RunMR = (options) => {
            log.debug('ACTIONS.RunMR options', options)
            try {
                let transKey = generateTransactionKey()
                let paramEPIData = options.postData
                log.debug('ACTIONS.RunMR paramEPIData', paramEPIData)
                var objForm = serverWidget.createForm({
                    title: options.title,
                });
                let objParamMR = {
                    transKey: transKey,
                    epiData: paramEPIData
                }
                addButtons({
                    form: objForm,
                    status: 'PENDING'
                });

                var MapReduceTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: slMapping.SUITELET.mrscriptid,
                    params: {
                        custscript_epia0f11_data: JSON.stringify(objParamMR)
                    }
                });

                let taskId = MapReduceTask.submit();

                addFields({
                    form: objForm,
                    epiData: paramEPIData,
                    transkey: transKey,
                    taskId: taskId
                });

                objForm.clientScriptModulePath = slMapping.SUITELET.form.CS_PATH;
                
                return objForm;

            } catch (err) {
                log.error('ERROR_RUN_MR:', err.message)
            }
        }

        ACTIONS.viewResults = (options) => {
            try {
                var objForm = serverWidget.createForm({
                    title: options.title,
                });
                log.debug('buildForm options', options)

                objForm.clientScriptModulePath = slMapping.SUITELET.form.CS_PATH;

                objForm.addButton({
                    id: 'custpage_goback_btn',
                    label : 'Main Page',
                    functionName: 'refreshPage'
                }); 
                objForm.addButton({
                    id: 'custpage_view_btn',
                    label : 'View Results',
                    functionName: 'viewResults'
                }); 

                objForm.addField({
                    id: 'custpage_transkey',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Transaction Key'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                }).defaultValue = options.transkey;
 
                viewSublistFields({
                    form: objForm,  
                    parameters: options.transkey
                });

                return objForm;
            } catch (err) {
                log.error('ERROR_VIEW_RESULTS:', err.message)
            }
        }

        const addButtons = (options) => {
            log.debug('addButtons options', options)
            try {
                if(options.status == 'PROCESSING' || options.status == 'PENDING'){
                    const submitButton = options.form.addSubmitButton({
                        label: slMapping.SUITELET.form.buttons.SUBMIT.label,
                    });
                    submitButton.isHidden = true;
                } else if (options.status == 'COMPLETE' && options.status != 'FAILED'){
                    options.form.addButton(slMapping.SUITELET.form.buttons.GO_BACK)
                    options.form.addButton(slMapping.SUITELET.form.buttons.VIEW_RESULTS)
                
                } else {
                    options.form.addButton(slMapping.SUITELET.form.buttons.GO_BACK)
                }  
            } catch (err) {
                log.error("BUILD_FORM_ADD_BUTTONS_ERROR", err.message);
            }
        };

        const addFields = (options) => {
            log.debug('addFields options', options)
            try {
                let strData = null
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
                    if (slMapping.SUITELET.form.fields[strKey].hasdefault) {
                        log.debug('strKey', strKey)
                        if(strKey == 'EPI_DATA'){
                            strData = options.epiData;
                        } else if (strKey == 'TRANSKEY'){
                            strData = options.transkey;
                        } else if (strKey == 'TASK_ID'){
                            strData = options.taskId;
                        }
                        objField.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.INLINE
                        }).defaultValue = strData
                       
                    }
                }
            } catch (err) {
                log.error("BUILD_FORM_ADD_BODY_FILTERS_ERROR", err.message);
            }
        };

        const viewSublistFields = (options) => {
            try {
                let sublist = options.form.addSublist({
                    id : 'custpage_sublist',
					type : serverWidget.SublistType.LIST,
					label : 'List of Payroll Record',
					tab: 'custpage_tabid'
                });
                for (var strKey in slMapping.SUITELET.form.sublistfields) {
                    sublist.addField(slMapping.SUITELET.form.sublistfields[strKey]);
                }

                let paramTransKey = options.parameters
                log.debug('viewSublistFields paramTransKey', paramTransKey);
                if (paramTransKey){
                    let arrSearchResults = runViewSearch(paramTransKey)
                    arrSearchResults.forEach((data, index) => {
                        for (const key in data) {
                            let value = data[key];
                            if (value){
                                if (key == 'custpage_view'){
                                    var strEPIChildRecUrl = url.resolveRecord({
                                        recordType: 'customrecord_epia0f11_child',
                                        recordId: value
                                    });
                                    let recLink = `<a href='${strEPIChildRecUrl}' target="_blank" rel="noopener noreferrer">${value}</a>`
                                    sublist.setSublistValue({
                                        id: key,
                                        line: index,
                                        value: recLink,
                                    });
                                } else if (key == 'custpage_parent_record_id'){
                                    var strEPIParentRecUrl = url.resolveRecord({
                                        recordType: 'customrecord_epia0f11_parent',
                                        recordId: value
                                    });
                                    let recLink = `<a href='${strEPIParentRecUrl}' target="_blank" rel="noopener noreferrer">${value}</a>`
                                    sublist.setSublistValue({
                                        id: key,
                                        line: index,
                                        value: recLink,
                                    });
                                } else if (key == 'custpage_epia0f11_remarks_child') {
                                    let displayValue = value;
                                
                                    if (value == 'Existing Record') {
                                        displayValue = `<span style="color: red;">${value}</span>`;
                                    }
                                
                                    sublist.setSublistValue({
                                        id: key,
                                        line: index,
                                        value: displayValue,
                                    });
                                } else {
                                    sublist.setSublistValue({
                                        id: key,
                                        line: index,
                                        value: value,
                                    });
                                }
                                
                            }
 
                        }
                    });
                }
            } catch (err) {
                log.error("BUILD_FORM_ADD_SUBLIST_ERROR", err.message);
            }
        }

        const runViewSearch = (paramTransKey) => {
            log.debug('runViewSearch started');
            try {
                let strTransKey = paramTransKey
                log.debug('runViewSearch strTransKey', strTransKey);

                let arrSearchResults = []

                let objSavedSearch = search.create({
                    type: 'customrecord_epia0f11_child',
                    filters: [
                        ['custrecord_epia0f11_trans_key_child', 'is', strTransKey],
                    ],
                    columns: [
                        search.createColumn({ name: 'internalid', label: 'custpage_view'}),
                        search.createColumn({ name: 'custrecord_epia0f11_parent_rec_id', label: 'custpage_epia0f11_parent_rec_id'}),
                        search.createColumn({ name: 'custrecord_epia0f11_remarks_child', label: 'custpage_epia0f11_remarks_child'}),

                        search.createColumn({ name: 'custrecord_epia0f11_co_code_col_01', label: 'custpage_epia0f11_co_code_col_01'}),
                        search.createColumn({ name: 'custrecord_epia0f11_batch_id_col_02', label: 'custpage_epia0f11_batch_id_col_02'}),
                        search.createColumn({ name: 'custrecord_epia0f11_file_no_03', label: 'custpage_epia0f11_file_no_03'}),
                        search.createColumn({ name: 'custrecord_epia0f11_tax_freq_col_04', label: 'custpage_epia0f11_tax_freq_col_04'}),
                        search.createColumn({ name: 'custrecord_epia0f11_temp_dept_col_05', label: 'custpage_epia0f11_temp_dept_col_05'}),
                        search.createColumn({ name: 'custrecord_epia0f11_temp_rate_col_06', label: 'custpage_epia0f11_temp_rate_col_06'}),
                        search.createColumn({ name: 'custrecord_epia0f11_reg_hours_col_07', label: 'custpage_epia0f11_reg_hours_col_07'}),
                        search.createColumn({ name: 'custrecord_epia0f11_reg_earn_08', label: 'custpage_epia0f11_reg_earn_08'}),
                        search.createColumn({ name: 'custrecord_epia0f11_ot_hours_col_09', label: 'custpage_epia0f11_ot_hours_col_09'}),
                        search.createColumn({ name: 'custrecord_epia0f11_ot_earn_10', label: 'custpage_epia0f11_ot_earn_10'}),
                        search.createColumn({ name: 'custrecord_epia0f11_hour_code_sth_col_11', label: 'custpage_epia0f11_hour_code_sth_col_11'}),
                        search.createColumn({ name: 'custrecord_epia0f11_hour_amt_sth_col_12', label: 'custpage_epia0f11_hour_amt_sth_col_12'}),
                        search.createColumn({ name: 'custrecord_epia0f11_earn_code_sth_col_13', label: 'custpage_epia0f11_earn_code_sth_col_13'}),
                        search.createColumn({ name: 'custrecord_epia0f11_earn_amt_sth_col_14', label: 'custpage_epia0f11_earn_amt_sth_col_14'}),
                        search.createColumn({ name: 'custrecord_epia0f11_hour_code_s15_col_15', label: 'custpage_epia0f11_hour_code_s15_col_15'}),
                        search.createColumn({ name: 'custrecord_epia0f11_hour_amt_s15_col_16', label: 'custpage_epia0f11_hour_amt_s15_col_16'}),
                        search.createColumn({ name: 'custrecord_epia0f11_earn_code_s15_col_17', label: 'custpage_epia0f11_earn_code_s15_col_17'}),
                        search.createColumn({ name: 'custrecord_epia0f11_earn_amt_s15_col_18', label: 'custpage_epia0f11_earn_amt_s15_col_18'}),
                        search.createColumn({ name: 'custrecord_epia0f11_hour_code_sck_col_19', label: 'custpage_epia0f11_hour_code_sck_col_19'}),
                        search.createColumn({ name: 'custrecord_epia0f11_hour_amt_sck_col_20', label: 'custpage_epia0f11_hour_amt_sck_col_20'}),
                        search.createColumn({ name: 'custrecord_epia0f11_earn_code_sck_col_21', label: 'custpage_epia0f11_earn_code_sck_col_21'}),
                        search.createColumn({ name: 'custrecord_epia0f11_earn_amt_sck_col_22', label: 'custpage_epia0f11_earn_amt_sck_col_22'}),
                        search.createColumn({ name: 'custrecord_epia0f11_hour_code_exp_col_23', label: 'custpage_epia0f11_hour_code_exp_col_23'}),
                        search.createColumn({ name: 'custrecord_epia0f11_hour_amt_exp_col_24', label: 'custpage_epia0f11_hour_amt_exp_col_24'}),
                        search.createColumn({ name: 'custrecord_epia0f11_earn_code_exp_col_25', label: 'custpage_epia0f11_earn_code_exp_col_25'}),
                        search.createColumn({ name: 'custrecord_epia0f11_earn_amt_exp_col_26', label: 'custpage_epia0f11_earn_amt_exp_col_26'}),
                        search.createColumn({ name: 'custrecord_epia0f11_earn_code_vac_col_27', label: 'custpage_epia0f11_earn_code_vac_col_27'}),
                        search.createColumn({ name: 'custrecord_epia0f11_earn_amt_vac_col_28', label: 'custpage_epia0f11_earn_amt_vac_col_28'}),

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
                                pageColumns.forEach(function (result) {
                                    let resultLabel = result.label;
                                    objData[resultLabel] = pageData[pageResultIndex].getValue(result)
                                })
                                arrSearchResults.push(objData);
                            }
                        }   
                    }
                }
            log.debug(`runSearch runViewSearch ${Object.keys(arrSearchResults).length}`, arrSearchResults);
            return arrSearchResults;

            } catch (err) {
                log.error('Error: runViewSearch', err.message);
            }
        }

        const statusChecker = (paramTaskId, objForm) => {
            // Create a progress bar container
            const progressContainer = objForm.addField({
                id: 'custpage_progress_container',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Progress Bar'
            });
        
            // Set the HTML content for the progress bar and hidden field
            progressContainer.defaultValue = `
                <div id="progress-container" style="width: 100%; background-color: #f3f3f3; border-radius: 25px; overflow: hidden; margin: 20px 0;">
                    <div id="progress-bar" style="width: 0%; height: 30px; background-color: #4caf50; text-align: center; line-height: 30px; color: white; border-radius: 25px;">0%</div>
                </div>
                <input type="hidden" id="custpage_status" value="${task.checkStatus(paramTaskId).status}">
                <script>
                    let interval;
                    let progressBarComplete = false;
        
                    function animateProgressBar() {
                        let progressBar = document.getElementById("progress-bar");
                        let width = 0;
                        interval = setInterval(() => {
                            if (width >= 100) {
                                width = 100;
                                progressBarComplete = true; // Set the flag to true when complete
                                clearInterval(interval); // Stop the interval
                                document.getElementById("progress-container").style.display = 'none'; // Hide progress bar
                                // Trigger submit button click when progress is complete
                                document.querySelector('input[type="submit"]').click();
                            } else {
                                width++;
                            }
                            progressBar.style.width = width + '%';
                            progressBar.textContent = width + '%';
                        }, 12); // Faster animation (reduced interval time)
                    }
        
                    function stopProgressBar() {
                        clearInterval(interval);
                        document.getElementById("progress-container").style.display = 'none';
                    }
        
                    // Ensure the progress bar animation starts when the page loads
                    window.addEventListener('load', () => {
                        animateProgressBar();
                        
                        // Check the status from the hidden field
                        const status = document.getElementById('custpage_status').value;
                        if (status === 'COMPLETE') {
                            stopProgressBar();
                        }
                    });
                </script>
            `;
        
            var taskStatus = task.checkStatus(paramTaskId);
            var stStatus = taskStatus.status;
        
            if (stStatus === 'PROCESSING'){
                addButtons({
                    form: objForm,
                    status: stStatus
                });
            } else if (stStatus === 'COMPLETE'){
                addButtons({
                    form: objForm,
                    status: stStatus
                });
            } else if (stStatus === 'PENDING'){
                addButtons({
                    form: objForm,
                    status: stStatus
                });
            } else {
                addButtons({
                    form: objForm,
                    status: stStatus
                });
                objForm.addPageInitMessage({
                    type: message.Type.ERROR,
                    message: 'If the issue persists, feel free to try again or reach out to your administrator for assistance.',
                    duration: 5000
                });
            }
        }
        
        
        
        
        
        

        const generateTransactionKey = () => {
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            const charactersLength = characters.length;
            const timestamp = new Date().getTime().toString();
          
            let result = '';
          
            // Generate random characters
            for (let i = 0; i < 20; i++) {
              result += characters.charAt(Math.floor(Math.random() * charactersLength));
            }
          
            // Concatenate with timestamp
            result += timestamp;
          
            return result;
        }

        return { FORM, ACTIONS }
    });
