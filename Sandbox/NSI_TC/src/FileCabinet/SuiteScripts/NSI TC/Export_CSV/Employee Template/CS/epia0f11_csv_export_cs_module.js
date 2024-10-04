/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/ui/message', 'N/search', 'N/currentRecord', '../Library/epia0f11_csv_export_sl_mapping.js', 'N/url', 'N/runtime', 'N/url'],

    function (message, search, currentRecord, slMapping, url, runtime, url) {

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

                            // getSublistData()

                            let objEPIData = currentRecord.getValue({
                                fieldId: 'custpage_epi_data',
                            });

                            var suiteletUrl = url.resolveScript({
                                scriptId: 'customscript_create_epia0f1_land_page_sl', 
                                deploymentId: 'customdeploy_create_epia0f1_land_page_sl',
                                params: {
                                    postData: objEPIData // paramEmployeeData.txt
                                }
                            });
                    
                            window.location.href = suiteletUrl;
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

                let csvContent = "Co Code,Batch ID,File #,Tax Frequency,Temp Dept,Temp Rate,Reg Hours,Reg Earnings,O/T Hours,O/T Earnings,Hours 3 Code,Hours 3 Amount,Earnings 3 Code,Earnings 3 Amount,Hours 3 Code,Hours 3 Amount,Earnings 3 Code,Earnings 3 Amount,Hours 3 Code,Hours 3 Amount,Earnings 3 Code,Earnings 3 Amount,Earnings 5 Code,Earnings 5 Amount,Earnings 5 Code,Earnings 5 Amount,Earnings 5 Code,Earnings 5 Amount\n";
                

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

                    console.log('columnValues', columnValues)
                    csvContent += columnValues.join(',') + '\n';
                }

                let blob = new Blob([csvContent], { type: 'text/csv' });
                let url = URL.createObjectURL(blob);
                
                let a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'EPIA0F11.csv';
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
