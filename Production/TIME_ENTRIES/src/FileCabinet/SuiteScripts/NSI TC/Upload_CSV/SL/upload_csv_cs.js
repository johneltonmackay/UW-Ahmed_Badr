/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/ui/message', 'N/search', 'N/currentRecord', 'N/url', 'N/runtime', 'N/url', 'N/https', 'N/ui/dialog'],

    function (message, search, currentRecord, url, runtime, url, https, dialog,) {

        function pageInit(scriptContext) {
            try {
                console.log('Page Fully Loaded.');
                let urlParams = new URLSearchParams(window.location.search);
                let dataParam = urlParams.get('taskId');
                let strTaskId = dataParam;
                console.log('strTaskId', strTaskId);
                if (strTaskId) {
                    let myMsg = message.create({
                        title: 'Please Wait...',
                        message: 'Data Creation Started!',
                        type: message.Type.INFORMATION
                    });
                    myMsg.show({
                        duration: 5000 
                    });

                    setTimeout(function() {
                        checkScriptStatus(strTaskId);
                    }, 1000); // 1000 milliseconds = 1 second
                }
            } catch (error) {
                console.log('Error: pageInit', error.message);
            }
        }
        
        const searchScriptStatus = (mrIdValue) => {
            let isDone = true
            try {
                let objSearch = search.create({
                    type: 'scheduledscriptinstance',
                    filters:  [
                        ['taskid', 'startswith', mrIdValue],
                        'AND',
                        ['enddate', 'isempty', ''],
                    ],
                    columns: [
                        search.createColumn({ name: 'enddate' }),
                    ]
                });
                
                var searchResultCount = objSearch.runPaged().count;
                if (searchResultCount != 0) {
                    var pagedData = objSearch.runPaged({pageSize: 1000});
                    for (var i = 0; i < pagedData.pageRanges.length; i++) {
                        var currentPage = pagedData.fetch(i);
                        var pageData = currentPage.data;
                        if (pageData.length > 0) {
                            for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                              let dtEndDate = pageData[pageResultIndex].getValue({name: 'enddate'})
                              console.log("searchScriptStatus dtEndDate", dtEndDate)
                              if (dtEndDate) {
                                isDone = false
                              }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('searchScriptStatus', err.message);
            }
            console.log("searchScriptStatus isDone", isDone)
            return isDone;
        }

        const checkScriptStatus = async (mrIdValue) => {
            // Show the loading message box once before entering the loop
            const loadingMsgBox = Ext.MessageBox.show({
                title: 'Processing',
                msg: 'Please Wait...',
                wait: true,
                icon: Ext.window.MessageBox.INFO,
                width: 400,
            });
        
            let isDone = false;
        
            while (!isDone) {
                isDone = searchScriptStatus(mrIdValue);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 seconds
            }
        
            // Close the loading message box
            loadingMsgBox.close();
        
            Ext.MessageBox.show({
                title: 'Success',
                msg: 'The process has been completed successfully.',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.INFO    
            });
        }

        return {
            pageInit: pageInit,
        };

    });
