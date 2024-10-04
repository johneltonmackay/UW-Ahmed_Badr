/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/redirect', 'N/ui/serverWidget', 'N/task', 'N/ui/message', "../Library/epia0f11_create_epi_sl_module.js", "../Library/epia0f11_create_epi_sl_mapping.js",],
    /**
 * @param{record} record
 * @param{redirect} redirect
 * @param{serverWidget} serverWidget
 */
    (record, redirect, serverWidget, task, message, module, mapping) => {
        const CONTEXT_METHOD = {
            GET: "GET",
            POST: "POST"
        };
        const onRequest = (scriptContext) => {
            try {
                if (scriptContext.request.method == CONTEXT_METHOD.POST) {

                    let scriptObj = scriptContext.request.parameters;
                    log.debug('onRequest POST scriptObj', scriptObj)

                    let epiData = scriptObj.custpage_epi_data
                    let transKey = scriptObj.custpage_transkey
                    let taskId = scriptObj.custpage_mr_id

                    let objPostParam = {
                        taskId: taskId,
                        transKey: transKey,
                        epiData: epiData,
                        isPosted: true
                    }

                    redirect.toSuitelet({
                        scriptId: 'customscript_create_epia0f1_land_page_sl',
                        deploymentId: 'customdeploy_create_epia0f1_land_page_sl',
                        parameters: {
                            postData: JSON.stringify(objPostParam)
                        }
                    });

                } else {
                    let scriptObj = scriptContext.request.parameters;
                    log.debug('onRequest GET scriptObj', scriptObj)

                    if(scriptObj.postData){
                        let postData = JSON.parse(scriptObj.postData);

                        let paramPosted = postData.isPosted
                        let paramEPIData = postData

                        if(!paramPosted){
                            objForm = module.ACTIONS.RunMR({
                                title: mapping.SUITELET.form.title,
                                postData: paramEPIData
                            });
                        } else {
                            objForm = module.FORM.buildForm({
                                title: mapping.SUITELET.form.title,
                                dataParam: scriptContext.request.parameters.postData
                            });
                        }
                    } else if(scriptObj.transkey){
                        objForm = module.ACTIONS.viewResults({
                            title: mapping.SUITELET.form.title,
                            transkey: scriptObj.transkey
                        });  
                    }

                    scriptContext.response.writePage(objForm);

                }
            } catch (err) {
                log.error('ERROR ONREQUEST:', err.message)
            }
        }

        return {onRequest}

    });
