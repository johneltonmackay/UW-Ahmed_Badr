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
            log.debug('scriptContext', scriptContext);
            if (scriptContext.request.method == CONTEXT_METHOD.GET) {
                try {
                    let scriptObj = scriptContext.request.parameters;
                    log.debug('GET onRequest scriptObj', scriptObj);
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
                                let objRecData = record.create({
                                    type: 'customrecord_epia0f11_child',
                                    isDynamic: true
                                })
                
                                for (const key in data) {
                                    let fieldIds = key.replace('custpage', 'custrecord')
                                    let fieldValue = data[key]
                                    objRecData.setValue({
                                        fieldId: fieldIds,
                                        value: fieldValue
                                    }) 
                                }
                                let recordId = objRecData.save()
                                log.debug('reduce recordId', recordId) 
            
                                if (recordId){
                                    arrProcessLines.push({
                                        lineValue: data, 
                                        reason: 'Record creation Success with Record ID: ' + recordId
                                    });
                                }
            
                            } catch (arrTimeEntriesError) {
                                log.error('arrTimeEntriesError error', arrTimeEntriesError.message)
                                arrSkippedLines.push({
                                    lineValue: data, 
                                    reason: arrTimeEntriesError.message
                                });
                            }

                        });

                        objLogs = {
                            skippedLines: arrSkippedLines,
                            processLines: arrProcessLines,
                        }

                        deleteParamFile(scriptObj.data)
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

        
        const deleteParamFile = (fileId)  => { 
            try {
                file.delete({ id: fileId });
                log.debug('File Deleted', `File with ID ${fileId} was successfully deleted.`);
            } catch (e) {
                log.error('File Deletion Error', `Failed to delete file with ID ${fileId}: ${e.message}`);
            }
        }

        return {onRequest}

    });


