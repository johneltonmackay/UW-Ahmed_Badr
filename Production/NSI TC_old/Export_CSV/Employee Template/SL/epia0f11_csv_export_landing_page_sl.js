/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/file', 'N/record', 'N/search', "../Library/epia0f11_csv_export_sl_module.js", "../Library/epia0f11_csv_export_sl_mapping.js", "N/redirect"],
    /**
 * @param{file} file
 * @param{record} record
 * @param{search} search
 */
    (file, record, search, module, mapping, redirect) => {
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
            var objForm = ""
            try {
                if (scriptContext.request.method == CONTEXT_METHOD.POST) {
                    let arrParam = []
                    let scriptObj = scriptContext.request.parameters;
                    log.debug('POST onRequest scriptObj', scriptObj);
                    let strBatchId = scriptContext.request.parameters['custpage_batch_id'];
                    let strDateRange = scriptContext.request.parameters['inpt_custpage_date_range'];
                    let intDateRange = scriptContext.request.parameters['custpage_date_range'];
                    let blnIsPost = scriptContext.request.parameters['custpage_is_post'];
                    if (blnIsPost == 'T') {
                        let objPostParam = {
                            custpage_batch_id: strBatchId,
                            custpage_date_range: strDateRange,
                            custpage_is_post: true,
                            intDateRange: intDateRange
                        }
                        arrParam.push(objPostParam)
                        redirect.toSuitelet({
                            scriptId: mapping.SUITELET.scriptid,
                            deploymentId: mapping.SUITELET.deploymentid,
                            parameters: {
                                data: JSON.stringify(arrParam)
                            }
                        });
                    }
                } else {
                    let scriptObj = scriptContext.request.parameters;
                    log.debug('GET onRequest scriptObj', scriptObj);

                    objForm = module.FORM.buildForm({ // searchItems
                        title: mapping.SUITELET.form.title,
                        dataParam: scriptContext.request.parameters.data
                    });
                        
                    scriptContext.response.writePage(objForm);
                }

            } catch (err) {
                log.error('ERROR ONREQUEST:', err)
            }
        }

        return {onRequest}

    });
