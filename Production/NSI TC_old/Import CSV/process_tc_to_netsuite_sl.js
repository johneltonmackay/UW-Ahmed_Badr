/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/log', 'N/record', 'N/file'],
    /**
 * @param{log} log
 * @param{record} record
 */
    (log, record, file) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */

        const CONTEXT_METHOD = {
            GET: "GET",
            POST: "POST"
        };

        const onRequest = (scriptContext) => {
            if (scriptContext.request.method == CONTEXT_METHOD.GET) {
                try {
                    let scriptObj = scriptContext.request.parameters;
                    // log.debug('GET onRequest scriptObj', scriptObj);
                    let arrProcessLines = []
                    let arrSkippedLines = []
                    let objLogs = {}

                    if(scriptObj.data){

                        let fileObj = file.load({
                            id: scriptObj.data
                        });
                    
                        let fileContent = fileObj.getContents();
                        let arrParam = JSON.parse(fileContent)

                        log.debug('arrParam', arrParam);

                        arrParam.forEach((data, i) => {
                            try {
                                let objTimeEntries = record.create({
                                    type: record.Type.TIME_BILL,
                                    isDynamic: true
                                })
                
                                objTimeEntries.setValue({
                                    fieldId: 'employee',
                                    value: data.employee
                                })
                
                                objTimeEntries.setValue({
                                    fieldId: 'trandate',
                                    value: new Date(data.trandate)
                                });

                                objTimeEntries.setValue({
                                    fieldId: 'hours',
                                    value: data.hours
                                })
                
                                objTimeEntries.setValue({
                                    fieldId: 'customer',
                                    value: data.customer
                                })
            
                                objTimeEntries.setValue({
                                    fieldId: 'casetaskevent',
                                    value: data.task
                                })
            
                                let recordId = objTimeEntries.save({
                                    enableSourcing: true,
                                    ignoreMandatoryFields: true
                                });
            
                                log.debug("recordId", recordId)
            
                                if (recordId){
                                    arrProcessLines.push({
                                        lineNumber: data.lineNumber,
                                        lineValue: data, 
                                        reason: 'Record creation Success with Record ID: ' + recordId
                                    });
                                }
            
                            } catch (arrTimeEntriesError) {
                                log.error('arrTimeEntriesError error', arrTimeEntriesError.message)
                                arrSkippedLines.push({
                                    lineNumber: data.lineNumber,
                                    lineValue: data, 
                                    reason: arrTimeEntriesError.message
                                });
                            }

                        });

                        objLogs = {
                            skippedLines: arrSkippedLines,
                            processLines: arrProcessLines,
                        }
                    }

                    scriptContext.response.write({
                        output: JSON.stringify({
                            success: true,
                            message: 'Record created successfully.',
                            objLogs: objLogs
                        })
                    });

                } catch (e) {
                    log.error('Error Creating Record', e.message);
                    // Send an error response
                    scriptContext.response.write({
                        output: JSON.stringify({
                            success: false,
                            message: 'Error creating record: ' + e.message
                        })
                    });
                }


            } 
        }

        return {onRequest}

    });


