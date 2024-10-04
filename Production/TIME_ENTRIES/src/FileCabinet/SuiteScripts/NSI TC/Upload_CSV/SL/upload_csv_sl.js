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
                            // uploadedFile.folder = 1494; // SB
                            uploadedFile.folder = 1612; // PROD 
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
                                log.debug('taskId', taskId)

                                statusChecker(taskId, scriptContext)

                            }
                            log.debug('onRequest POST fileId', fileId);
                        }
                    } else if (scriptObj.custpage_taskid){
                        statusChecker(scriptObj.custpage_taskid, scriptContext)
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
                    }

                    scriptContext.response.writePage(objForm);
                }
            } catch (err) {
                log.error('ERROR ONREQUEST:', err.message);
            }
        };

        const statusChecker = (paramTaskId, scriptContext) => {
            try {

                const status = task.checkStatus(paramTaskId).status;

                var objForm = serverWidget.createForm({
                    title: 'Upload CSV',
                });

                const inttaskID = objForm.addField({
                    id: 'custpage_taskid',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Task Id'
                });
                inttaskID.updateDisplayType({displayType: 'HIDDEN'});
                inttaskID.defaultValue = status === 'COMPLETE' ? null : paramTaskId;
        
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
                                alert('CSV Upload Complete, You will be redirected soon.')
                                document.querySelector('input[type="submit"]').click();
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
                } else if (stStatus === 'PENDING'){
                    addButtons({
                        form: objForm,
                        status: stStatus
                    });
                } else if (stStatus === 'COMPLETE'){
                    addButtons({
                        form: objForm,
                        status: stStatus
                    });
                }

                scriptContext.response.writePage(objForm);

            } catch (error) {
                log.error("statusChecker", error.message);
            }

        }

        const addButtons = (options) => {
            log.debug('addButtons options', options)
            try {
                if(options.status == 'PROCESSING' || options.status == 'PENDING' || options.status == 'COMPLETE'){
                    const submitButton = options.form.addSubmitButton({
                        label: 'CHECK STATUS',
                    });
                    submitButton.isHidden = true;
                } 
            } catch (err) {
                log.error("BUILD_FORM_ADD_BUTTONS_ERROR", err.message);
            }
        };

        return { onRequest };
    });

