/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/file', 'N/record', 'N/redirect', 'N/ui/serverWidget', 'N/error', 'N/task', 'N/log', 'N/url'],
    /**
     * @param{file} file
     * @param{record} record
     * @param{redirect} redirect
     * @param{serverWidget} serverWidget
     * @param{error} error
     * @param{task} task
     * @param{log} log
     */
    (file, record, redirect, serverWidget, error, task, log, url) => {
        const CONTEXT_METHOD = {
            GET: "GET",
            POST: "POST"
        };

        const onRequest = (scriptContext) => {
            try {
                if (scriptContext.request.method === CONTEXT_METHOD.POST) {
                    let scriptObj = scriptContext.request.parameters;
                    log.debug('onRequest POST scriptObj', scriptObj);

                    var uploadedFile = scriptContext.request.files.custpage_csv_file;

                    if (uploadedFile){
                        if (uploadedFile.fileType !== file.Type.CSV) {
                            let mycustomError = error.create({
                                name: 'INVALID FILE TYPE',
                                message: 'Please upload CSV File Only',
                                notifyOff: false
                            });
    
                            redirect.toSuitelet({
                                scriptId: 'customscript_upload_csv_sl',
                                deploymentId: 'customdeploy_upload_csv_sl',
                                parameters: {
                                    data: mycustomError.message
                                }
                            });
                        } else {
                            log.debug('uploadedFile.name', uploadedFile.name)
                            let strFileName = uploadedFile.name
                            uploadedFile.folder = 1494;
                            var fileId = uploadedFile.save();
                            if (fileId) {
                                var mapReduceTask = task.create({
                                    taskType: task.TaskType.MAP_REDUCE,
                                    scriptId: 'customscript_push_tc_mr',
                                    params: {
                                        custscript_file_name: strFileName
                                    }
                                });
                            
                                var taskId = mapReduceTask.submit();
                                log.debug('taskId', taskId);
                            
                                // Retry logic if taskId is not valid
                                var maxRetries = 5;  // Set maximum number of retries
                                var retries = 0;
                            
                                while (!taskId && retries < maxRetries) {
                                    log.debug('Retrying submission', 'Attempt #' + (retries + 1));
                                    taskId = mapReduceTask.submit();
                                    retries++;
                                }
                            
                                if (taskId) {
                                    redirect.toSuitelet({
                                        scriptId: 'customscript_upload_csv_sl',
                                        deploymentId: 'customdeploy_upload_csv_sl',
                                        parameters: {
                                            taskId: taskId
                                        }
                                    });
                                } else {
                                    let mycustomError = error.create({
                                        name: 'NO DEPLOYMENT AVAILABLE',
                                        message: 'Failed to submit task. Unable to get a valid task Id after ' + maxRetries + ' retries. Please Try Again Later.',
                                        notifyOff: false
                                    });
            
                                    redirect.toSuitelet({
                                        scriptId: 'customscript_upload_csv_sl',
                                        deploymentId: 'customdeploy_upload_csv_sl',
                                        parameters: {
                                            data: mycustomError.message
                                        }
                                    });
                                }
                            }
                            
                            log.debug('onRequest POST fileId', fileId);
                        }
                    } else {
                        redirect.toSuitelet({
                            scriptId: 'customscript_upload_csv_sl',
                            deploymentId: 'customdeploy_upload_csv_sl',
                        });
                    }
                } else {
                    let scriptObj = scriptContext.request.parameters;
                    log.debug('onRequest GET scriptObj', scriptObj);

                    if (scriptObj.data){
    
                        var objForm = serverWidget.createForm({
                            title: 'File Upload Error'
                        });
                    
                        objForm.addField({
                            id: 'custpage_error_message',
                            type: serverWidget.FieldType.INLINEHTML,
                            label: 'Error Message'
                        }).defaultValue = '<p style="color:red; font-weight:bold;">' + scriptObj.data + '</p>';

                        objForm.addSubmitButton({
                            label: 'Try Again'
                        });
                    
                    } else {
                        var objForm = serverWidget.createForm({
                            title: 'Upload CSV File'
                        });
    
                        var fileField = objForm.addField({
                            id: 'custpage_csv_file',
                            type: serverWidget.FieldType.FILE,
                            label: 'CSV File'
                        });
                        fileField.isMandatory = true;
    
                        objForm.addSubmitButton({
                            label: 'Upload'
                        });

                        objForm.clientScriptModulePath = './upload_csv_cs.js';
                    }

                    scriptContext.response.writePage(objForm);
                }
            } catch (err) {
                log.error('ERROR ONREQUEST:', err.message);
            }
        };

        return { onRequest };
    });

