/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/error', 'N/runtime'],
    /**
 * @param{record} record
 */
    (record, error, runtime) => {

        const beforeLoad = (context) => {
            if (context.type === context.UserEventType.CREATE && runtime.executionContext === 'USERINTERFACE') {
                let mycustomError = error.create({       
                    name: 'RESTRICTED RECORD',
                    message: 'You are not allowed to access this record through user interface.',
                    notifyOff: false
                })

                throw mycustomError.message;
            }
        }

        return {beforeLoad}

    });
