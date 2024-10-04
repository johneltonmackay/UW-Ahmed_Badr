/**
 * @NApiVersion 2.1
 */
define([],
    
    () => {

        const SUITELET = {
            scriptid: 'customscript_create_epi_landing_page_sl',
            deploymentid: 'customdeploy_create_epi_landing_page_sl',
            mrscriptid: 'customscript_create_epi_mr',

            exportSLId: 'customscript_csv_export_landing_page_sl',
            exportSLDepId: 'customdeploy_csv_export_landing_page_sl',
            form: {
                title: "EPI4A110 Record Creation",
                fields: {
                    EPI_DATA: {
                        id: "custpage_epi_data",
                        type: "LONGTEXT",
                        label: "EPI DATA",
                        ishidden: false,
                        ismandatory: true,
                        hasdefault: true
                    },
                    TRANSKEY: {
                        id: "custpage_transkey",
                        type: "LONGTEXT",
                        label: "TRANSACTION KEY",
                        ishidden: false,
                        hasdefault: true
                    },
                    TASK_ID: {
                        id: "custpage_mr_id",
                        type: "LONGTEXT",
                        label: "TASK Id",
                        ishidden: false,
                        hasdefault: true
                    },
                },
                buttons: {
                    SUBMIT: {
                        label: 'CHECK STATUS',
                    },
                    GO_BACK: {
                        label: 'Main Page',
                        id: 'custpage_back_btn',
                        functionName: 'refreshPage'
                    },
                    VIEW_RESULTS: {
                        label: 'VIEW RESULTS',
                        id: 'custpage_view_btn',
                        functionName: 'viewResults'
                    },
                },
                sublistfields: {
                    PARENT: {
                        id: "custpage_parent_record_id",
                        label: "PAYROLL PERIOD ID",
                        type : 'text',
                    },
                    VIEW: {
                        id: "custpage_view",
                        label: "PAYROLL RECORD ID",
                        type : 'text',
                    },
                    REMARKS: {
                        id: "custpage_remarks",
                        label: "REMARKS",
                        type : 'text',
                    },
                    CO_CODE_COL_01: {
                        id: "custpage_co_code_col_01",
                        label: "Co Code",
                        type : 'text',
                    },
                    BATCH_ID_COL02: {
                        id: "custpage_batch_id_col_02",
                        label: "Batch ID",
                        type : 'text',
                    },
                    FILE_NO_COL_03: {
                        id: "custpage_file_no_col_03",
                        label: "File #",
                        type : 'text',
                    },
                    EARN_5_CODE_COL_04: {
                        id: "custpage_earn_5_code_col_04",
                        label: "Earnings 5 Code",
                        type: "text",
                    },
                    EARN_AMOUNT_COL_05: {
                        id: "custpage_earn_5_amount_col_05",
                        label: "Earnings 5 Amount",
                        type: "text",
                    },
                    EARN_5_CODE_COL_06: {
                        id: "custpage_earn_5_code_col_06",
                        label: "Earnings 5 Code",
                        type: "text",
                    },
                    EARN_AMOUNT_COL_07: {
                        id: "custpage_earn_5_amount_col_07",
                        label: "Earnings 5 Amount",
                        type: "text",
                    },
                    EARN_5_CODE_COL_08: {
                        id: "custpage_earn_5_code_col_08",
                        label: "Earnings 5 Code",
                        type: "text",
                    },
                    EARN_AMOUNT_COL_09: {
                        id: "custpage_earn_5_amount_col_09",
                        label: "Earnings 5 Amount",
                        type: "text",
                    },
                },

                CS_PATH: '../CS/create_epi_cs_module.js',
            },
        }

        const NOTIFICATION = {
            REQUIRED: {
                title: 'REQUIRED FIELDS MISSING',
                message: "Kindly ensure all mandatory fields are completed before proceeding with the preview."
            },
        }

        return { SUITELET, NOTIFICATION }

    });
