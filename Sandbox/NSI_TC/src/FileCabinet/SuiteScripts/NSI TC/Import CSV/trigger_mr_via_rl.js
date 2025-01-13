/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/task'],
    /**
 * @param{task} task
 */
    (task) => {
        /**
         * Defines the function that is executed when a GET request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const get = (requestParams) => {
            let objReturn = {}

            try {
                let strFileName = 'actual_hours.csv'
                // Trigger the Map/Reduce Script
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
                    objReturn = { success: true, taskId: taskId }

                } else {
                    let mycustomError = error.create({
                        name: 'NO DEPLOYMENT AVAILABLE',
                        message: 'Failed to submit task. Unable to get a valid task Id after ' + maxRetries + ' retries. Please Try Again Later.',
                        notifyOff: false
                    });
                    objReturn = { success: false, message: mycustomError.message }
                }
                
            } catch (e) {
                log.error('Error in Restlet', e.message);
                objReturn = { success: false, message: e.message }
            }
            return JSON.stringify(objReturn);
        }

        /**
         * Defines the function that is executed when a PUT request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body are passed as a string when request
         *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const put = (requestBody) => {

        }

        /**
         * Defines the function that is executed when a POST request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body is passed as a string when request
         *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const post = (requestBody) => {

        }

        /**
         * Defines the function that is executed when a DELETE request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters are passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const doDelete = (requestParams) => {

        }

        return {get, put, post, delete: doDelete}

    });
