/**
 * @NApiVersion 2.1
 */
define([],
    
    () => {

        const SUITELET = {
            scriptid: 'customscript_csv_export_landing_page_sl',
            mrscriptid: 'customscript_create_epi_mr',
            deploymentid: 'customdeploy_csv_export_landing_page_sl',
            form: {
                title: "Export EPI4A110",
                fields: {
                    BATCH_ID: {
                        id: "custpage_batch_id",
                        type: "TEXT",
                        label: "BATCH ID",
                        ismandatory: true,
                    },
                    IS_POSTED: {
                        id: "custpage_is_post",
                        type: "CHECKBOX",
                        label: "IS POSTED",
                        ishidden: true
                    },
                    TASK_ID: {
                        id: "custpage_mr_id",
                        type: "TEXT",
                        label: "TASK Id",
                        ishidden: true
                    },
                    ARR_EPI_DATA: {
                        id: "custpage_epi_data",
                        type: "LONGTEXT",
                        label: "EPI DATA",
                        ishidden: true
                    },
                    DATE_FILTER: {
                        id: "custpage_date_range",
                        type: "SELECT",
                        label: "DATE RANGE FILTER",
                        ismandatory: true,
                        source: 'customlist_epi_date_options',
                    },
                },
                buttons: {
                    SUBMIT: {
                        label: 'CONVERT TO EPI',
                    },
                    SEARCH_ITEM: {
                        label: 'PREVIEW',
                        id: 'custpage_search_btn',
                        functionName: 'searchItems'
                    },
                    DOWNLOAD_CSV: {
                        label: 'DOWNLOAD CSV',
                        id: 'custpage_download_csv_btn',
                        functionName: 'exportCSV'
                    },
                    REFRESH: {
                        label: 'REFRESH',
                        id: 'custpage_reset_btn',
                        functionName: 'refreshPage'
                    },
                },
                sublistfields: {
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
                    // EARN_5_CODE_COL_04: {
                    //     id: "custpage_earn_5_code_col_04",
                    //     label: "Earnings 5 Code",
                    //     type: "text",
                    // },
                    // EARN_AMOUNT_COL_05: {
                    //     id: "custpage_earn_5_amount_col_05",
                    //     label: "Earnings 5 Amount",
                    //     type: "text",
                    // },
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

                CS_PATH: '../CS/csv_export_cs_module.js',
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
