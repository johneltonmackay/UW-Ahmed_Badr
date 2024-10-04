/**
 * @NApiVersion 2.1
 */
define([],
    
    () => {

        const SUITELET = {
            scriptid: 'customscript_epia0f11_csv_export_sl',
            mrscriptid: 'customscript_create_epia0f11_mr',
            deploymentid: 'customdeploy_epia0f11_csv_export_sl',
            uploaddeploymentid: 'customdeploy_upload_csv_sl',
            uploadscriptid: 'customscript_upload_csv_sl',
            form: {
                title: "Export Employees Payroll Template",
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
                        label: 'Create Employees Payroll Records',
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
                    IMPORT_TIMESHEET: {
                        label: 'IMPORT TIMESHEET',
                        id: 'custpage_import_timesheet_btn',
                        functionName: 'importCSV'
                    },
                    REFRESH: {
                        label: 'REFRESH',
                        id: 'custpage_reset_btn',
                        functionName: 'refreshPage'
                    },
                },
                sublistfields: {
                    CO_CODE_COL_01: {
                        id: "custpage_epia0f11_co_code_col_01",
                        label: "Co Code",
                        type : 'text',
                    },
                    BATCH_ID_COL02: {
                        id: "custpage_epia0f11_batch_id_col_02",
                        label: "Batch ID",
                        type : 'text',
                    },
                    FILE_NO_COL_03: {
                        id: "custpage_epia0f11_file_no_03",
                        label: "File #",
                        type : 'text',
                    },
                    TAX_FREQ_COL_04: {
                        id: "custpage_epia0f11_tax_freq_col_04",
                        label: "Tax Frequency",
                        type: "text",
                    },
                    TEMP_DEPT_COL_05: {
                        id: "custpage_epia0f11_temp_dept_col_05",
                        label: "Temp Dept",
                        type: "text",
                    },
                    TEMP_RATE_COL_06: {
                        id: "custpage_epia0f11_temp_rate_col_06",
                        label: "Temp Rate",
                        type: "text",
                    },
                    REG_HOURS_COL_07: {
                        id: "custpage_epia0f11_reg_hours_col_07",
                        label: "Reg Hours",
                        type: "text",
                    },
                    REG_EARN_COL_08: {
                        id: "custpage_epia0f11_reg_earn_08",
                        label: "Reg Earnings",
                        type: "text",
                    },
                    OT_HOURS_COL_09: {
                        id: "custpage_epia0f11_ot_hours_col_09",
                        label: "O/T Hours",
                       type: "text",
                    }, 
                    OT_EARN_HOURS_COL_10: {
                        id: "custpage_epia0f11_ot_earn_10",
                        label: "O/T Earnings",
                       type: "text",
                    }, 
                    HOUR_CODE_STH_COL_11: {
                        id: "custpage_epia0f11_hour_code_sth_col_11",
                        label: "Hours 3 Code",
                       type: "text",
                    }, 
                    HOUR_AMT_STH_COL_10: {
                        id: "custpage_epia0f11_hour_amt_sth_col_12",
                        label: "Hours 3 Amount",
                       type: "text",
                    }, 
                    EARN_CODE_STH_COL_10: {
                        id: "custpage_epia0f11_earn_code_sth_col_13",
                        label: "Earnings 3 Code",
                       type: "text",
                    }, 
                    EARN_AMT_STH_COL_10: {
                        id: "custpage_epia0f11_earn_amt_sth_col_14",
                        label: "Earnings 3 Amount",
                       type: "text",
                    }, 
                    HOUR_CODE_S15_COL_10: {
                        id: "custpage_epia0f11_hour_code_s15_col_15",
                        label: "Hours 3 Code",
                       type: "text",
                    }, 
                    HOUR_AMT_S15_COL_10: {
                        id: "custpage_epia0f11_hour_amt_s15_col_16",
                        label: "Hours 3 Amount",
                       type: "text",
                    }, 
                    EARN_CODE_S15_COL_10: {
                        id: "custpage_epia0f11_earn_code_s15_col_17",
                        label: "Earnings 3 Code",
                       type: "text",
                    }, 
                    EARN_AMT_S15_COL_10: {
                        id: "custpage_epia0f11_earn_amt_s15_col_18",
                        label: "Earnings 3 Amount",
                       type: "text",
                    }, 
                    HOUR_CODE_SCK_COL_10: {
                        id: "custpage_epia0f11_hour_code_sck_col_19",
                        label: "Hours 3 Code",
                       type: "text",
                    }, 
                    HOUR_AMT_SCK_COL_10: {
                        id: "custpage_epia0f11_hour_amt_sck_col_20",
                        label: "Hours 3 Amount",
                       type: "text",
                    }, 
                    EARN_CODE_SCK_COL_10: {
                        id: "custpage_epia0f11_earn_code_sck_col_21",
                        label: "Earnings 3 Code",
                       type: "text",
                    }, 
                    EARN_AMT_SCK_COL_10: {
                        id: "custpage_epia0f11_earn_amt_sck_col_22",
                        label: "Earnings 3 Amount",
                       type: "text",
                    }, 
                    EARN_CODE_EXP_COL_10: {
                        id: "custpage_epia0f11_hour_code_exp_col_23",
                        label: "Earnings 5 Code",
                       type: "text",
                    }, 
                    EARN_AMT_EXP_COL_10: {
                        id: "custpage_epia0f11_hour_amt_exp_col_24",
                        label: "Earnings 5 Amount",
                       type: "text",
                    }, 
                    EARN_CODE_EXP_COL_10: {
                        id: "custpage_epia0f11_earn_code_exp_col_25",
                        label: "Earnings 5 Code",
                       type: "text",
                    }, 
                    EARN_AMT_EXP_COL_10: {
                        id: "custpage_epia0f11_earn_amt_exp_col_26",
                        label: "Earnings 5 Amount",
                       type: "text",
                    }, 
                    EARN_CODE_VAC_COL_10: {
                        id: "custpage_epia0f11_earn_code_vac_col_27",
                        label: "Earnings 5 Code",
                       type: "text",
                    }, 
                    EARN_AMT_VAC_COL_10: {
                        id: "custpage_epia0f11_earn_amt_vac_col_28",
                        label: "Earnings 5 Amount",
                       type: "text",
                    }, 
                },

                CS_PATH: '../CS/epia0f11_csv_export_cs_module.js',
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
