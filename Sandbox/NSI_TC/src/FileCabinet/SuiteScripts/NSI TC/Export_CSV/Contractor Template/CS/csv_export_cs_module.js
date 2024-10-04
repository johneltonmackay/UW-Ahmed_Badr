/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/ui/message', 'N/search', 'N/currentRecord', '../Library/csv_export_sl_mapping.js', 'N/url', 'N/runtime', 'N/url', 'N/https', 'N/ui/dialog'],

    function (message, search, currentRecord, slMapping, url, runtime, url, https, dialog,) {

        function pageInit(scriptContext) {
            try {
                console.log('Page Fully Loaded.');
                var currentRecord = scriptContext.currentRecord;
                let objForm = currentRecord.form
                console.log('objForm', objForm);
                let urlParams = new URLSearchParams(window.location.search);
                let dataParam = urlParams.get('data');
                let arrjsonData = JSON.parse(dataParam);
                console.log('arrjsonData', arrjsonData);
                if (arrjsonData) {
                    arrjsonData.forEach(data => {
                        console.log('data', data);
                        for (let key in data) {
                            let value = data[key];
                            console.log('key:', key, 'value:', value);
                            // If the field is a date field, convert the string to a Date object
                            if (key.includes('date')) {
                                currentRecord.setText({
                                    fieldId: key,
                                    text: value
                                });
                            }
                            else {
                                currentRecord.setValue({
                                    fieldId: key,
                                    value: value
                                });
                            } 
                        }
                        if (data.custpage_is_post){

                            let myMsg = message.create({
                                title: 'Please Wait, You will be redirected soon.',
                                message: 'Data Creation Started!',
                                type: message.Type.INFORMATION
                            });
                            myMsg.show({
                                duration: 5000 
                            });

                            let objEPIData = currentRecord.getValue({
                                fieldId: 'custpage_epi_data',
                            });

                            var suiteletUrl = url.resolveScript({
                                scriptId: 'customscript_create_epi_landing_page_sl', 
                                deploymentId: 'customdeploy_create_epi_landing_page_sl',
                                params: {
                                    postData: objEPIData // paramContractorData.txt
                                }
                            });

                            // Use Ext.Ajax to fetch content from the Suitelet
                            Ext.Ajax.request({
                                url: suiteletUrl,
                                method: 'GET',
                                params: {
                                    postData: objEPIData
                                },
                                success: function(response) {
                                    let content = response.responseText;
                                    let tempDiv = document.createElement('div');
                                    tempDiv.innerHTML = content;
                            
                                    // Extract values of specific fields by ID
                                    let mrIdValue = tempDiv.querySelector('#custpage_mr_id') ? tempDiv.querySelector('#custpage_mr_id').textContent.trim() : 'Field not found';
                                    let transKeyValue = tempDiv.querySelector('#custpage_transkey') ? tempDiv.querySelector('#custpage_transkey').textContent.trim() : 'Field not found';
                                    
                                    async function checkScriptStatus(mrIdValue) {
                                        // Show the loading message box once before entering the loop
                                        const loadingMsgBox = Ext.MessageBox.show({
                                            title: `Processing`,
                                            msg: "Please Wait...",
                                            wait: true,
                                            icon: Ext.window.MessageBox.INFO,
                                            width: 400,
                                        });
                                    
                                        let isDone = false;
                                    
                                        while (!isDone) {
                                            isDone = searchScriptStatus(mrIdValue);
                                            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 seconds
                                        }
                                    
                                        // Close the loading message box
                                        loadingMsgBox.close();
                                    
                                        var suiteletVIEWUrl = url.resolveScript({
                                            scriptId: 'customscript_create_epi_landing_page_sl', 
                                            deploymentId: 'customdeploy_create_epi_landing_page_sl',
                                            params: {
                                                transkey: transKeyValue
                                            }
                                        });
                                
                                        window.location.href = suiteletVIEWUrl;
                                    }
                                    
                                    
                                    // Call the async function
                                    checkScriptStatus(mrIdValue);

                                    
                                },
                                failure: function() {
                                    Ext.MessageBox.alert('Error', 'Failed to load content from Suitelet.');
                                }
                            });
                            
                            
                            
                            
                        }
                    });
                }
            } catch (error) {
                console.log('Error: pageInit', error.message);
            }
        }
        
        function fieldChanged(scriptContext) {
            try {
                var currentRecord = scriptContext.currentRecord;
                console.log('fieldChanged', scriptContext.fieldId)

            } catch (error) {
                console.log('Error: fieldChanged', error.message)
            }
        }

        function saveRecord(scriptContext) {
            try {
                var rec = scriptContext.currentRecord;
                var intItemLines = rec.getLineCount('custpage_sublist');
                if(intItemLines == 0) {
				    alert('User Error: Please search at least one item.');
				    return false;
			    } else {
                    rec.setValue({
                        fieldId: 'custpage_is_post',
                        value: true
                    })
                    return true;
                }
            } catch (error) {
                console.log('Error: saveRecord', error.message)
            }
        }

        function searchItems(scriptContext) {
            let arrParameter = []
            let currRec = currentRecord.get()
            console.log('searchItems currRec', currRec)
            currRec.setValue({
                fieldId: 'custpage_is_post',
                value: false
            })
            try {
                const fieldValues = {}
                for (let strKey in slMapping.SUITELET.form.fields) {
                    let fieldId = slMapping.SUITELET.form.fields[strKey].id
                    let value = ''
                    switch (fieldId) {
                        case 'custpage_date_range':
                            value = currRec.getText({
                                fieldId: fieldId
                            });
                            break;
                        default:
                            value = currRec.getValue({
                                fieldId: fieldId
                            });
                            break;
                    }
                    
                    if (value){
                        fieldValues[fieldId] = value; // Dynamically setting fieldId
                        if (!arrParameter.includes(fieldValues)){
                            arrParameter.push(fieldValues);
                        }
                    }
                }
                console.log('searchItems arrParameter', JSON.stringify(arrParameter))

                let blnisValid = false

                if (arrParameter[0].custpage_batch_id && arrParameter[0].custpage_date_range) {
                    blnisValid = true;
                }
                console.log('searchItems blnisValid', blnisValid)

                if (blnisValid){
                    var sURL = url.resolveScript({
                        scriptId : slMapping.SUITELET.scriptid,
                        deploymentId : slMapping.SUITELET.deploymentid,
                        returnExternalUrl : false,
                        params : {
                            data: JSON.stringify(arrParameter)
                        }
                    });
                
                    window.onbeforeunload = null;
                    window.location = sURL;
                } else {
                    let objMessage = message.create({
                        type: message.Type.WARNING,
                        ...slMapping.NOTIFICATION.REQUIRED
                    });
                    objMessage.show({
                        duration: 5000 // will disappear after 5s
                    });
                }
            } catch (error) {
                console.log('Error: searchItems', error.message)
            }
        }

        function refreshPage(scriptContext) {
            try {          
                var sURL = url.resolveScript({
                    scriptId : slMapping.SUITELET.scriptid,
                    deploymentId : slMapping.SUITELET.deploymentid,
                    returnExternalUrl : false,
                });
            
                window.onbeforeunload = null;
                window.location = sURL;
            } catch (error) {
                console.log('Error: refreshPage', error.message)
            }
        }

        function importCSV(scriptContext) {
            try {          
                var sURL = url.resolveScript({
                    scriptId : slMapping.SUITELET.uploadscriptid,
                    deploymentId : slMapping.SUITELET.uploaddeploymentid,
                    returnExternalUrl : false,
                });
            
                window.onbeforeunload = null;
                window.location = sURL;
            } catch (error) {
                console.log('Error: refreshPage', error.message)
            }
        }
        
        function exportCSV(scriptContext) {
            try {         
                let arrParameter = []
                let currRec = currentRecord.get()
                let lineCount = currRec.getLineCount({ sublistId: 'custpage_sublist' });

                let csvContent = "Co Code,Batch ID,File #,Earnings 5 Code,Earnings 5 Amount,Earnings 5 Code,Earnings 5 Amount,Earnings 5 Code,Earnings 5 Amount\n";
                

                for (let i = 0; i < lineCount; i++) {
                    let columnValues = [];
                    for (var strKey in slMapping.SUITELET.form.sublistfields) {
                        let fieldInfo = slMapping.SUITELET.form.sublistfields[strKey];

                        let columnValue = currRec.getSublistValue({
                            sublistId: 'custpage_sublist',
                            fieldId: fieldInfo.id,
                            line: i
                        });

                        columnValues.push(columnValue);
                    }

                    // Add two static values
                    columnValues.splice(3, 0, ''); // Earnings 5 Code
                    columnValues.splice(4, 0, ''); // Earnings 5 Amount

                    console.log('columnValues', columnValues)
                    csvContent += columnValues.join(',') + '\n';
                }

                let blob = new Blob([csvContent], { type: 'text/csv' });
                let url = URL.createObjectURL(blob);
                
                let a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'EPI4A110.csv';
                document.body.appendChild(a);
                a.click();
                
                // Clean up
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (error) {
                console.log('Error: exportCSV', error.message)
            }
        }

        function getSublistData(scriptContext) {
            try {         
                let arrEPIData = [];
                let currRec = currentRecord.get()
                let intDateRange = currRec.getValue({
                    fieldId: 'custpage_date_range'
                })
                let lineCount = currRec.getLineCount({ sublistId: 'custpage_sublist' });
                if(lineCount > 0){
                    for (let i = 0; i < lineCount; i++) {
                        let objData = {}
                        for (var strKey in slMapping.SUITELET.form.sublistfields) {
                            let fieldInfo = slMapping.SUITELET.form.sublistfields[strKey];
                            let fieldValue = currRec.getSublistValue({
                                sublistId: 'custpage_sublist',
                                fieldId: fieldInfo.id,
                                line: i
                            });
                            objData[fieldInfo.id] = fieldValue
                            objData.custpage_date_range = intDateRange
                        }
                        arrEPIData.push(objData);
                    }
                    console.log('getSublistData arrEPIData', arrEPIData)
                }

                currRec.setValue({
                    fieldId: 'custpage_epi_data',
                    value: JSON.stringify(arrEPIData)
                })


            } catch (error) {
                console.log('Error: getSublistData', error.message)
            }
        }

        const searchScriptStatus = (mrIdValue) => {
            let isDone = true
            try {
                let objSearch = search.create({
                    type: 'scheduledscriptinstance',
                    filters:  [
                        ['taskid', 'startswith', mrIdValue],
                        'AND',
                        ['enddate', 'isempty', ''],
                    ],
                    columns: [
                        search.createColumn({ name: 'enddate' }),
                    ]
                });
                
                var searchResultCount = objSearch.runPaged().count;
                if (searchResultCount != 0) {
                    var pagedData = objSearch.runPaged({pageSize: 1000});
                    for (var i = 0; i < pagedData.pageRanges.length; i++) {
                        var currentPage = pagedData.fetch(i);
                        var pageData = currentPage.data;
                        if (pageData.length > 0) {
                            for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                              let dtEndDate = pageData[pageResultIndex].getValue({name: 'enddate'})
                              console.log("searchScriptStatus dtEndDate", dtEndDate)
                              if (dtEndDate) {
                                isDone = false
                              }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('searchScriptStatus', err.message);
            }
            console.log("searchScriptStatus isDone", isDone)
            return isDone;
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            saveRecord: saveRecord,
            searchItems: searchItems,
            refreshPage: refreshPage,
            exportCSV: exportCSV,
            getSublistData: getSublistData,
            importCSV: importCSV
        };

    });
