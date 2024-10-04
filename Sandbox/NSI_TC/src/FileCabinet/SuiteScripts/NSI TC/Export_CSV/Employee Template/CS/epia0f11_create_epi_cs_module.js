/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/ui/message', 'N/search', 'N/currentRecord', '../Library/epia0f11_create_epi_sl_mapping.js', 'N/url', 'N/runtime', 'N/url'],

    function (message, search, currentRecord, slMapping, url, runtime, url) {

        function pageInit(scriptContext) {
            try {
                console.log('Page Fully Loaded.');
                let urlParams = new URLSearchParams(window.location.search);
                let postData = urlParams.get('postData');
                if (postData) {
                    let data = JSON.parse(postData);
                    console.log('typeof data', typeof data);

                    if (typeof data === 'number' && data !== null) {
                        const submitButton = document.querySelector('input[type="submit"]');
                        if (submitButton) {
                            submitButton.click();
                            console.log('Submit button clicked.');
                        } else {
                            console.log('Submit button not found.');
                        }
                    }
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

        function viewResults(scriptContext) {
            let currRec = currentRecord.get()
            console.log('viewResults currRec', currRec)
            try {
                let strTransKey = currRec.getValue({
                    fieldId: 'custpage_transkey'
                });
                console.log('viewResults strTransKey', strTransKey)
                var sURL = url.resolveScript({
                    scriptId : slMapping.SUITELET.scriptid,
                    deploymentId : slMapping.SUITELET.deploymentid,
                    returnExternalUrl : false,
                    params : {
                        transkey: strTransKey
                    }
                });
            
                window.onbeforeunload = null;
                window.location = sURL;
            } catch (error) {
                console.log('Error: viewResults', error.message)
            }
        }

        function refreshPage(scriptContext) {
            try {          
                var sURL = url.resolveScript({
                    scriptId : slMapping.SUITELET.exportSLId,
                    deploymentId : slMapping.SUITELET.exportSLDepId,
                    returnExternalUrl : false,
                });
            
                window.onbeforeunload = null;
                window.location = sURL;
            } catch (error) {
                console.log('Error: refreshPage', error.message)
            }
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            refreshPage: refreshPage,
            viewResults: viewResults
        };

    });
