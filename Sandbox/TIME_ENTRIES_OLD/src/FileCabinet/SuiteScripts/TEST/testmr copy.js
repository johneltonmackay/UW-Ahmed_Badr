/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/file', 'N/record', 'N/search', 'N/runtime', 'N/format'],
    /**
 * @param{file} file
 * @param{record} record
 * @param{search} search
 */
    (file, record, search, runtime, format) => {
  
        const getInputData = (inputContext) => {
            try {
                const stFileIdParam = runtime.getCurrentScript().getParameter({
                    name: 'custscript_file_id'
                });
            
                let fileObj = file.load({
                    id: stFileIdParam
                });
            
                let fileContent = fileObj.getContents();
                let fileLines = fileContent.split('\n');
                let csvData = [];
                let skippedLines = []; 
                let arrFilteredItems = []
                let validatedData = []

                let arrTimeEntries = searchTimeEntries()

                for (let i = 0; i < fileLines.length; i++) {
                    let line = fileLines[i].trim();
                
                    if (!line || line.split(',').length < 6) {
                        skippedLines.push({
                            lineNumber: i + 1,
                            lineValue: line,
                            reason: 'Has Empty Values'
                        }); 
                    }
                
                    let columns = line.split(',').map(col => col.trim());
                
                    if (columns.length === 6) {
                        let obj = {
                            'lineNumber': i + 1,
                            'fileId': stFileIdParam,
                            'projectId': columns[0],
                            'taskId': columns[1],
                            'class': columns[2],
                            'employeeId': columns[3],
                            'actualHours': columns[4],
                            'date': columns[5].replace('\r', ''),
                        };
                        csvData.push(obj);
                    } 
                }

                csvData.forEach((data, i) => { 
                    let projId = data.projectId;
                    let taskId = data.taskId;
                    let empId = data.employeeId;
                    let actHours = data.actualHours;
                    let date = returnDateFormat(data.date)

                    const arrFilteredItems = arrTimeEntries.filter(item =>
                        item.date == date &&
                        item.empId == empId &&
                        item.customer == projId &&
                        item.hours == actHours
                    );

                    log.debug('arrFilteredItems', arrFilteredItems)
                
                    if (arrFilteredItems.length > 0) {
                        skippedLines.push({
                            lineNumber: i + 1,
                            lineValue: data, 
                            reason: 'Time Entry Exist, Record ID: ' + arrFilteredItems[0].timeEntryId 
                        });
                    } else {
                        validatedData.push(data)
                    }
                });
                
                let inputData = {
                    fileId: stFileIdParam,
                    toProcess: validatedData,
                    skippedLines: skippedLines
                }

                arrFilteredItems.push(inputData)
                log.debug('arrFilteredItems', arrFilteredItems);

                return arrFilteredItems;  
            } catch (error) {
                log.error('getInputData error', error.message)
            }      
        }
        

        const map = (mapContext) => {
            try {
                log.debug('map : mapContext', mapContext);
                let objMapValue = JSON.parse(mapContext.value)
                let fileId = objMapValue.fileId;
                let arrToProcess = objMapValue.toProcess
                let arrSkippedLines = objMapValue.skippedLines
                let hasProjectId = true
                let hasTaskId = true
                let hasClassId = true
                let hasEmployeeId = true
                let resProjId = []
                let resClassId  = []
                let resEmpId  = []
                let resTaskId  = []
                let arrValidatedData = []

                arrToProcess.forEach((dataToProcess, i) => {
                    let intprojectId = dataToProcess.projectId
                    let intTaskId = dataToProcess.taskId
                    let strClass = dataToProcess.class
                    let intEmployeeId = dataToProcess.employeeId
                    let intHours = dataToProcess.actualHours
                    let intDate = dataToProcess.date
        
                    if (intprojectId) {
                        try {
                            resProjId = searchProjectId(intprojectId)
                            if (!resProjId){
                                arrSkippedLines.push({
                                    lineNumber: i + 1,
                                    lineValue: dataToProcess, 
                                    reason: 'Invalid Project ID: ' + intprojectId 
                                });
                                hasProjectId = false
                            }
                        } catch (error) {
                            arrSkippedLines.push({
                                lineNumber: i + 1,
                                lineValue: dataToProcess, 
                                reason: 'Invalid Project ID: ' + intprojectId 
                            });
                            hasProjectId = false
                        }
                    }

                    if (intTaskId) {
                        try {
                            resTaskId = searchTaskId(intTaskId)
                            if (!resTaskId){
                                arrSkippedLines.push({
                                    lineNumber: i + 1,
                                    lineValue: dataToProcess, 
                                    reason: 'Invalid Project ID: ' + intTaskId 
                                });
                                hasTaskId = false
                            }
                        } catch (error) {
                            arrSkippedLines.push({
                                lineNumber: i + 1,
                                lineValue: dataToProcess, 
                                reason: 'Invalid Project ID: ' + intTaskId 
                            });
                            hasTaskId = false
                        }  
                    }

                    if (strClass){
                        try {
                            resClassId = searchClassId(strClass)
                            if (!resClassId){
                                arrSkippedLines.push({
                                    lineNumber: i + 1,
                                    lineValue: dataToProcess, 
                                    reason: 'Invalid Class ID: ' + strClass 
                                });
                                hasClassId = false
                            }
                        } catch (error) {
                            arrSkippedLines.push({
                                lineNumber: i + 1,
                                lineValue: dataToProcess, 
                                reason: 'Invalid Class ID: ' + strClass 
                            });
                            hasClassId = false
                        } 
                    }
        
                    if (intEmployeeId){
                        try {
                            resEmpId = searchEmpId(intEmployeeId)
                            if (!resClassId){
                                arrSkippedLines.push({
                                    lineNumber: i + 1,
                                    lineValue: dataToProcess, 
                                    reason: 'Invalid Employee ID: ' + intEmployeeId 
                                });
                                hasEmployeeId = false
                            }
                        } catch (error) {
                            arrSkippedLines.push({
                                lineNumber: i + 1,
                                lineValue: dataToProcess, 
                                reason: 'Invalid Employee ID: ' + intEmployeeId 
                            });
                            hasEmployeeId = false
                        }
                    }

                    if (hasProjectId && hasClassId && hasEmployeeId && hasTaskId){
                        data = {
                            employee: resEmpId[0].empId ? resEmpId[0].empId : null,
                            customer: resProjId[0].projectId ? resProjId[0].projectId : null,
                            class: resClassId[0].classId ? resClassId[0].classId : null,
                            task: resTaskId[0].taskId ? resTaskId[0].taskId : null,
                            hours: intHours ? intHours : null,
                            trandate: intDate ? intDate : null
                        }
                        arrValidatedData.push(data)
                    }

                });

                let mapInput = {
                    toProcess: arrValidatedData,
                    skippedLines: arrSkippedLines
                }

                log.debug('map : mapInput', mapInput);
                mapContext.write({
                    key: fileId,
                    value: mapInput
                })

            } catch (error) {
                log.error('map error', error.message)
            }
        }

        const reduce = (reduceContext) => {
            try {
                log.debug('reduce : reduceContext', reduceContext);
                let objReduceValues = JSON.parse(reduceContext.values[0])
                log.debug('reduce objReduceValues', objReduceValues);

                let arrToProcess = objReduceValues.toProcess
                let arrSkippedLines = objReduceValues.skippedLines
                let arrProcessLines = []

                log.debug('reduce arrToProcess', arrToProcess);

                let arrTimeEntries = [];

                for (let value of arrToProcess) {
                    log.debug('reduce objReduceValue', value);

                    let parsedEntry = value;

                    if (parsedEntry.trandate) {

                        let resFormatDate = convertDateFormat(parsedEntry.trandate)
                        let dtDate = stringToDate(resFormatDate)

                        parsedEntry.trandate = dtDate;
                    }

                    arrTimeEntries.push(parsedEntry);
                }

                arrTimeEntries.forEach((data, i) => {
                    try {
                        let objTimeEntries = record.create({
                            type: record.Type.TIME_BILL,
                            isDynamic: true
                        })
        
                        objTimeEntries.setValue({
                            fieldId: 'employee',
                            value: data.employee
                        })
        
                        objTimeEntries.setValue({
                            fieldId: 'trandate',
                            value: data.trandate
                        })
        
                        objTimeEntries.setValue({
                            fieldId: 'hours',
                            value: data.hours
                        })
        
                        objTimeEntries.setValue({
                            fieldId: 'customer',
                            value: data.customer
                        })
    
                        objTimeEntries.setValue({
                            fieldId: 'casetaskevent',
                            value: data.task
                        })
    
                        // objTimeEntries.setValue({
                        //     fieldId: 'item',
                        //     value: 57 // Design
                        // })
        
                        objTimeEntries.setValue({
                            fieldId: 'class',
                            value: data.class
                        })
    
                        let recordId = objTimeEntries.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        });
    
                        log.debug("reduce recordId", recordId)
    
                        if (!recordId){
                            arrSkippedLines.push({
                                lineNumber: i + 1,
                                lineValue: data, 
                                reason: 'There is a problem with record creation'
                            });
                        } else {
                            arrProcessLines.push({
                                lineNumber: i + 1,
                                lineValue: data, 
                                reason: 'Record creation Success with Record ID: ' + recordId
                            });
                        }
    
                    } catch (arrTimeEntriesError) {
                        log.error('arrTimeEntriesError error', arrTimeEntriesError.message)
                    }

                });

                let objLogs = {
                    skippedLines: arrSkippedLines,
                    processLines: arrProcessLines
                }

                if (objLogs){
                    createFileLogs(JSON.stringify(objLogs))
                }

            } catch (error) {
                log.error('reduce error', error.message)
            }
        }

        const summarize = (summaryContext) => {
            log.debug('summarize : summaryContext.output', summaryContext.output);
        }

        //Private Function

        const searchProjectId = (intProjectId) => {
            let arrProjectId = [];
            try {
                let objSearch = search.create({
                    type: 'job',
                    filters: [
                        ['custentity_nsi_doc_no', 'is', intProjectId],
                    ],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                    ],
                });
                var searchResultCount = objSearch.runPaged().count;
                if (searchResultCount != 0) {
                    var pagedData = objSearch.runPaged({pageSize: 1000});
                    for (var i = 0; i < pagedData.pageRanges.length; i++) {
                        var currentPage = pagedData.fetch(i);
                        var pageData = currentPage.data;
                        if (pageData.length > 0) {
                            for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                                arrProjectId.push({
                                    projectId: pageData[pageResultIndex].getValue({name: 'internalid'}),
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                log.error('searchProjectId', err);
            }
            log.debug("searchProjectId: arrProjectId", arrProjectId)
            return arrProjectId;
        }

        const searchTaskId = (intTaskId) => {
            let arrTaskId = [];
            try {
                let objSearch = search.create({
                    type: 'projecttask',
                    filters: [
                        ['title', 'is', intTaskId],
                    ],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                    ],
                });
                var searchResultCount = objSearch.runPaged().count;
                if (searchResultCount != 0) {
                    var pagedData = objSearch.runPaged({pageSize: 1000});
                    for (var i = 0; i < pagedData.pageRanges.length; i++) {
                        var currentPage = pagedData.fetch(i);
                        var pageData = currentPage.data;
                        if (pageData.length > 0) {
                            for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                                arrTaskId.push({
                                    taskId: pageData[pageResultIndex].getValue({name: 'internalid'}),
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                log.error('searchTaskId', err);
            }
            log.debug("searchTaskId: arrTaskId", arrTaskId)
            return arrTaskId;
        }

        const searchClassId = (intClassId) => {
            let arrClassId = [];
            try {
                let objSearch = search.create({
                    type: 'classification',
                    filters: [
                        ['name', 'is', intClassId],
                    ],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                    ],
                });
                var searchResultCount = objSearch.runPaged().count;
                if (searchResultCount != 0) {
                    var pagedData = objSearch.runPaged({pageSize: 1000});
                    for (var i = 0; i < pagedData.pageRanges.length; i++) {
                        var currentPage = pagedData.fetch(i);
                        var pageData = currentPage.data;
                        if (pageData.length > 0) {
                            for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                                arrClassId.push({
                                    classId: pageData[pageResultIndex].getValue({name: 'internalid'}),
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                log.error('searchClassId', err);
            }
            log.debug("searchClassId: arrClassId", arrClassId)
            return arrClassId;
        }

        const searchEmpId = (intEmployeeId) => {
            let arrEmpId = [];
            try {
                let objSearch = search.create({
                    type: 'employee',
                    filters: [
                        ['entityid', 'is', intEmployeeId],
                    ],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                    ],
                });
                var searchResultCount = objSearch.runPaged().count;
                if (searchResultCount != 0) {
                    var pagedData = objSearch.runPaged({pageSize: 1000});
                    for (var i = 0; i < pagedData.pageRanges.length; i++) {
                        var currentPage = pagedData.fetch(i);
                        var pageData = currentPage.data;
                        if (pageData.length > 0) {
                            for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                                arrEmpId.push({
                                    empId: pageData[pageResultIndex].getValue({name: 'internalid'}),
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                log.error('searchEmpId', err);
            }
            log.debug("searchEmpId: arrEmpId", arrEmpId)
            return arrEmpId;
        }

        const searchTimeEntries = () => {
            let arrTimeBillId = [];
            try {
                let objSearch = search.create({
                    type: 'timebill',
                    filters: [],
                    columns: [
                        search.createColumn({name: 'internalid' }),
                        search.createColumn({ name: 'date' }),
                        search.createColumn({ name: 'entityid', join: 'employee' }),
                        search.createColumn({ name: 'custentity_nsi_doc_no', join: 'customer' }),
                        search.createColumn({ name: 'hours' }),
                    ],
                });
                var searchResultCount = objSearch.runPaged().count;
                if (searchResultCount != 0) {
                    var pagedData = objSearch.runPaged({pageSize: 1000});
                    for (var i = 0; i < pagedData.pageRanges.length; i++) {
                        var currentPage = pagedData.fetch(i);
                        var pageData = currentPage.data;
                        if (pageData.length > 0) {
                            for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                                let rawHours = pageData[pageResultIndex].getValue({name: 'hours'})
                                let arrHours = rawHours.split(':')
                                arrTimeBillId.push({
                                    timeEntryId: pageData[pageResultIndex].getValue({name: 'internalid'}),
                                    date: pageData[pageResultIndex].getValue({name: 'date'}),
                                    empId: pageData[pageResultIndex].getValue({ name: 'entityid', join: 'employee' }),
                                    customer: pageData[pageResultIndex].getValue({ name: 'custentity_nsi_doc_no', join: 'customer' }),
                                    hours: arrHours[0],
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                log.error('searchTimeEntries', err);
            }
            log.debug("searchTimeEntries: arrTimeBillId", arrTimeBillId)
            return arrTimeBillId;
        }

        const createFileLogs = (arrLogs) => {
            log.debug('createFileLogs arrLogs', arrLogs)
            let today = new Date();
            let fileName = today + '-logs.txt';

            let fileObj = file.create({
                name: fileName,
                fileType: file.Type.PLAINTEXT,
                contents: arrLogs
            });

            fileObj.folder = 1410;

            let logId = fileObj.save();
            log.debug('createFileLogs logId', logId)
        }

        const convertDateFormat = (dateString) => {
            const [day, month, year] = dateString.split('/');
            return `${month}/${day}/${year}`;
        }

        const returnDateFormat = (dateString) => {
            const [month, day, year] = dateString.split('/');
            return `${day}/${month}/${year}`;
        }

        const stringToDate = (date)  => {           

            return format.parse({value: date, type: format.Type.DATE});
        }

        return {getInputData, map, reduce, summarize}

    });
