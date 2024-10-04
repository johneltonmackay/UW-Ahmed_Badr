/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/file', 'N/record', 'N/search', 'N/runtime', 'N/format', 'N/url', 'N/https', 'N/redirect'],
    /**
 * @param{file} file
 * @param{record} record
 * @param{search} search
 */
    (file, record, search, runtime, format, url, https, redirect) => {
  
        const getInputData = (inputContext) => {
            try {
                let csvData = [];
                let emptyLines = []; 
                let skippedLines = []; 
                let arrFilteredItems = []
                let validatedData = []
                let forUpdate = []
                let isStatWork = false

                const stFileIdParam = runtime.getCurrentScript().getParameter({
                    name: 'custscript_file_name'
                });

                if (stFileIdParam){

                    let arrFileId = searchFileId(stFileIdParam)
                    let intFileId = arrFileId[0].fileId
                    log.debug('getInputData intFileId', intFileId)
                    if (intFileId){
                        let fileObj = file.load({
                            id: intFileId
                        });
                    
                        let fileContent = fileObj.getContents();
                        let fileLines = fileContent.split('\n');
        
                        let arrTimeEntries = searchTimeEntries()
        
                        for (let i = 0; i < fileLines.length; i++) {
                            let line = fileLines[i].trim();

                            if (!line || line.split(',').length < 6) {
                                emptyLines.push({
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
                                    'projectId': columns[0].replace(/"/g, ''),
                                    'taskId': columns[1].replace(/"/g, ''),
                                    'employeeId': columns[2].replace(/"/g, ''),
                                    'actualHours': parseFloat(columns[3].replace(/"/g, '')).toFixed(2),
                                    'hourType': columns[4].replace(/"/g, ''),
                                    'date': returnDateFormat(columns[5].replace(/"/g, '')),
                                    'csvDate': columns[5].replace(/"/g, '')
                                };
                                csvData.push(obj);
                            }
                        }
                        log.debug('getInputData fileContent', fileContent)
                        log.debug('getInputData csvData', csvData)

                        csvData.forEach((data, i) => { 
                            let projId = data.projectId;
                            let taskId = data.taskId;
                            let empId = data.employeeId;
                            let actHours = data.actualHours;
                            let hourType = data.hourType;
                            let date = returnNSDateFormat(data.date)

                            let taskIsStatWork = taskId.includes('.STAT');
                            let isOvertime = hourType === 'OT';

                            if (taskIsStatWork && isOvertime){
                                isStatWork = true
                                isOvertime = false
                            } else {
                                isStatWork = false
                                if (hourType === 'OT'){
                                    isOvertime = true
                                } else{
                                    isOvertime = false
                                }
                            }

                            let positiveHours = actHours.replace(/-/g, '')
                            let convertedHours = convertHoursToTime(positiveHours)

                            let filter = {
                                'projectId': projId,
                                'taskId': taskId,
                                'employeeId': empId,
                                'actHours': convertedHours,
                                'date': date,
                                'isStatWork': isStatWork,
                                'isOvertime': isOvertime
                            };

        
                            log.debug('getInputData filter', filter)

                            const arrFilteredItems = arrTimeEntries.filter(item =>
                                item.date == date &&
                                item.empId == empId &&
                                item.customer == projId &&
                                item.taskId == taskId &&
                                item.hours == convertedHours &&
                                item.ot == isOvertime &&
                                item.stat == isStatWork
                            );
        
                            log.debug('getInputData arrTimeEntries arrFilteredItems', arrFilteredItems)
                        
                            if (arrFilteredItems.length > 0) {
                                skippedLines.push({
                                    lineNumber: i + 1,
                                    lineValue: data, 
                                    reason: 'Time Entry Exist, Record ID: ' + arrFilteredItems[0].timeEntryId 
                                });

                                if (parseFloat(actHours) < 0) {
                                    forUpdate.push({
                                        lineNumber: i + 1,
                                        lineValue: data, 
                                        reason: 'Negative actual hours' + actHours,
                                        timeEntryId: arrFilteredItems[0].timeEntryId,
                                    });
                                }

                            } else {
                                validatedData.push(data)
                            }
                        });
                    }
                }

                let inputData = {
                    fileId: stFileIdParam,
                    toProcess: validatedData,
                    skippedLines: skippedLines,
                    forUpdate: forUpdate
                }

                arrFilteredItems.push(inputData)
                log.debug('getInputData arrFilteredItems', arrFilteredItems);

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
                let arrToUpdateLines = objMapValue.forUpdate
                let resProjId = []
                let resEmpId  = []
                let resTaskId  = []
                let arrValidatedData = []

                arrToProcess.forEach((dataToProcess, i) => {
                    
                    let hasProjectId = true
                    let hasTaskId = true
                    let hasEmployeeId = true

                    let intprojectId = dataToProcess.projectId
                    let intTaskId = dataToProcess.taskId
                    let intEmployeeId = dataToProcess.employeeId
                    let intHours = dataToProcess.actualHours
                    let blnType = dataToProcess.hourType
                    let intDate = dataToProcess.date
                    let intLineNumber = dataToProcess.lineNumber
        
                    if (intprojectId) {
                        resProjId = searchProjectId(intprojectId)
                        if (resProjId.length == 0){
                            arrSkippedLines.push({
                                lineNumber: intLineNumber,
                                lineValue: dataToProcess, 
                                reason: 'Invalid Project ID: ' + intprojectId 
                            });
                            hasProjectId = false
                        }   
                    }

                    if (intTaskId && intprojectId) {
                        resTaskId = searchTaskId(intTaskId, intprojectId)
                        if (resTaskId.length == 0){
                            arrSkippedLines.push({
                                lineNumber: intLineNumber,
                                lineValue: dataToProcess, 
                                reason: 'Invalid Task ID: ' + intTaskId 
                            });
                            hasTaskId = false
                        }   
                    }
        
                    if (intEmployeeId){
                        resEmpId = searchEmpId(intEmployeeId)
                        if (resEmpId.length == 0){
                            arrSkippedLines.push({
                                lineNumber: intLineNumber,
                                lineValue: dataToProcess, 
                                reason: 'Invalid Employee ID: ' + intEmployeeId 
                            });
                            hasEmployeeId = false
                        }
                    }

                    if (hasProjectId && hasEmployeeId && hasTaskId){
                        data = {
                            lineNumber: intLineNumber,
                            employee: resEmpId[0].empId ? resEmpId[0].empId : null,
                            customer: resProjId[0].projectId ? resProjId[0].projectId : null,
                            task: resTaskId[0].taskId ? resTaskId[0].taskId : null,
                            hours: intHours ? intHours : null,
                            trandate: intDate ? intDate : null,
                            ot: blnType === 'OT' && !intTaskId.includes('.STAT') ? true : false,
                            stat: intTaskId.includes('.STAT') && blnType === 'OT' ? true : false,
                            csvTaskId: intTaskId,
                            csvEmpId: intEmployeeId,
                            csvDate: intDate

                        }
                        arrValidatedData.push(data)
                    }

                });

                let mapInput = {
                    toProcess: arrValidatedData,
                    skippedLines: arrSkippedLines,
                    forUpdate: arrToUpdateLines
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
                let arrToUpdateLines = objReduceValues.forUpdate
                let arrProcessLines = []
                let arrUpdatedTimeEntries = []

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

                const CHUNK_SIZE = 40;

                if (arrTimeEntries.length > CHUNK_SIZE) {
                    let chunks = splitArrayIntoChunks(arrTimeEntries, CHUNK_SIZE);
                    
                    for (let i = 0; i < chunks.length; i++) {
                        let chunk = chunks[i];

                        let fileId = createChunkFile(chunk, i)

                        if (fileId){
                            let slResponse = https.requestSuitelet({
                                scriptId: "customscript_process_tc_sl",
                                deploymentId: "customdeploy_process_tc_sl",
                                urlParams: {
                                    data: fileId
                                }
                            });
    
                            let responseBody = JSON.parse(slResponse.body);
                            log.debug('slResponse', responseBody);
    
                            if (responseBody.objLogs && responseBody.objLogs.skippedLines) {
                                arrSkippedLines = [...arrSkippedLines, ...responseBody.objLogs.skippedLines];
                            }
    
                            if (responseBody.objLogs && responseBody.objLogs.processLines) {
                                arrProcessLines = [...arrProcessLines, ...responseBody.objLogs.processLines];
                            }
                        }
                        
                    }
                } else {
                    let fileId = createChunkFile(arrTimeEntries, 0)

                    if (fileId){
                        let slResponse = https.requestSuitelet({
                            scriptId: "customscript_process_tc_sl",
                            deploymentId: "customdeploy_process_tc_sl",
                            urlParams: {
                                data: fileId
                            }
                        });
                        
                        let responseBody = JSON.parse(slResponse.body);
                        log.debug('slResponse', responseBody);
    
                        if (responseBody.objLogs && responseBody.objLogs.skippedLines) {
                            arrSkippedLines = [...arrSkippedLines, ...responseBody.objLogs.skippedLines];
                        }
    
                        if (responseBody.objLogs && responseBody.objLogs.processLines) {
                            arrProcessLines = [...arrProcessLines, ...responseBody.objLogs.processLines];
                        }
                    }

                }

                arrToUpdateLines.forEach(data => {
                    let actHours = lineValue.data.actHours
                    const objTimeEntry = record.load({
                        type: record.Type.TIME_BILL,
                        id: data.timeEntryId,
                        isDynamic: true
                    });
                    if(objTimeEntry){
                        let currHours = objTimeEntry.getValue({
                            fieldId: 'hours'
                        })
                        let newHours = currHours + actHours
                        log.debug('newHours', newHours)

                        objTimeEntry.setValue({
                            fieldId: 'hours',
                            value: newHours
                        })

                        let recordId = objTimeEntry.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        })

                        arrUpdatedTimeEntries.push({
                            lineNumber: data.lineNumber,
                            lineValue: data, 
                            reason: 'Record update Success with Record ID: ' + recordId
                        });
                    } else {
                        arrUpdatedTimeEntries.push({
                            lineNumber: data.lineNumber,
                            lineValue: data, 
                            reason: 'Time Entry Not Found, Record ID: ' + data.timeEntryId
                        });
                    }
                });

                let objLogs = {
                    skippedLines: arrSkippedLines,
                    processLines: arrProcessLines,
                    updatedTimeEntries: arrUpdatedTimeEntries
                }

                log.debug('objLogs', objLogs)

                if (objLogs){
                    createFileLogs(objLogs)
                }

            } catch (error) {
                log.error('reduce error', error.message)
            }
        }

        const summarize = (summaryContext) => {
          
        }

        //Private Function

        const searchFileId = (strFileName) => {
            log.debug('searchFileId strFileName', strFileName)

            let arrFileId = [];
            try {
                let objSearch = search.create({
                    type: 'file',
                    filters: [
                        ['name', 'is', strFileName],
                        'AND',
                        ['folder', 'anyof', '1612'], // NSI TC > Import CSV
                    ],
                    columns: [
                        search.createColumn({ name: 'created', sort: search.Sort.DESC }),
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
                                arrFileId.push({
                                    dataCreated: pageData[pageResultIndex].getValue({ name: 'created', sort: search.Sort.DESC }),
                                    fileId: pageData[pageResultIndex].getValue({name: 'internalid'}),
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                log.error('searchFileId', err);
            }
            log.debug("searchFileId: arrFileId", arrFileId)
            return arrFileId;
        }

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

        const searchTaskId = (intTaskId, intprojectId) => {
            let arrTaskId = [];
            try {
                let objSearch = search.create({
                    type: 'projecttask',
                    filters: [
                        ['custevent_chargecode', 'is', intTaskId],
                    ],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                        search.createColumn({ name: 'custentity_nsi_doc_no', join: 'job' })
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
                                let docNo = pageData[pageResultIndex].getValue({ name: 'custentity_nsi_doc_no', join: 'job' })
                                if(docNo == intprojectId){
                                    arrTaskId.push({
                                        taskId: pageData[pageResultIndex].getValue({name: 'internalid'}),
                                    });
                                }

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
                        search.createColumn({ name: 'custevent_chargecode', join: 'projecttask' }),
                        search.createColumn({ name: 'custevent_chargecode', join: 'projecttask' }),
                        search.createColumn({ name: 'custcol_time_track_over_time' }),
                        search.createColumn({ name: 'custcol_time_track_statutory_work' }),

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
                                arrTimeBillId.push({
                                    timeEntryId: pageData[pageResultIndex].getValue({name: 'internalid'}),
                                    date: pageData[pageResultIndex].getValue({name: 'date'}),
                                    empId: pageData[pageResultIndex].getValue({ name: 'entityid', join: 'employee' }),
                                    customer: pageData[pageResultIndex].getValue({ name: 'custentity_nsi_doc_no', join: 'customer' }),
                                    hours: pageData[pageResultIndex].getValue({name: 'hours'}),
                                    taskId: pageData[pageResultIndex].getValue({ name: 'custevent_chargecode', join: 'projecttask' }),
                                    ot: pageData[pageResultIndex].getValue({ name: 'custcol_time_track_over_time' }),
                                    stat: pageData[pageResultIndex].getValue({ name: 'custcol_time_track_statutory_work' })
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
            log.debug('createFileLogs arrLogs', arrLogs);
            let today = new Date();
            let fileName = today + '_logs.json';
        
            let logEntries = [];
        
            // Process skipped lines
            if (arrLogs.skippedLines && arrLogs.skippedLines.length > 0) {
                arrLogs.skippedLines.forEach(log => {
                    let failedMessage = `Failed: time track record failed (line ${log.lineValue.lineNumber}) due to ${log.reason}`;
                    logEntries.push(failedMessage);
                });
            }

            // Process processed lines
            if (arrLogs.processLines && arrLogs.processLines.length > 0) {
                arrLogs.processLines.forEach(log => {
                    let successMessage = `Success: time track record created for employee ${log.lineValue.csvEmpId} for task ${log.lineValue.csvTaskId} with hours ${log.lineValue.hours} on ${log.lineValue.csvDate}`;
                    logEntries.push(successMessage);
                });
            }

            // Process updated time entries
            if (arrLogs.updatedTimeEntries && arrLogs.updatedTimeEntries.length > 0) {
                arrLogs.updatedTimeEntries.forEach(log => {
                    let successMessage = `Success: time track record updated for employee ${log.lineValue.csvEmpId} for task ${log.lineValue.csvTaskId} with hours ${log.lineValue.hours} on ${log.lineValue.csvDate}`;
                    logEntries.push(successMessage);
                });
            }
        
            let fileObj = file.create({
                name: fileName,
                fileType: file.Type.JSON,
                contents: JSON.stringify(logEntries)
            });
        
            fileObj.folder = 1477; // NSI TC > Import CSV > File Logs
        
            let logId = fileObj.save();
            log.debug('createFileLogs logId', logId);
            log.debug('createFileLogs content', JSON.stringify(logEntries));
        };
        

        const createChunkFile = (arrLogs, index) => {
            let logId = null
            log.debug('createFileLogs arrLogs', arrLogs)
            try {
                let fileName = `paramChunkData_${index}.json`;
    
                let fileObj = file.create({
                    name: fileName,
                    fileType: file.Type.JSON,
                    contents: JSON.stringify(arrLogs)
                });
    
                fileObj.folder = 1491; // SuiteScripts > NSI TC > Import CSV > Parameter Chunk Data
    
                logId = fileObj.save();
                log.debug('createFileLogs logId', logId)
            } catch (error) {
                log.error('createFileLogs error', error.message)
            }
            return logId
        }

        const convertDateFormat = (dateString) => {
            const [day, month, year] = dateString.split('/');
            return `${month}/${day}/${year}`;
        }

        const returnNSDateFormat = (dateString) => {
            const [month, day, year] = dateString.split('/');
            const paddedMonth = month.padStart(2, '0');
            const paddedDay = day.padStart(2, '0');
            return `${paddedDay}/${paddedMonth}/${year}`;
        }

        const returnDateFormat = (dateString) => {
            const year = dateString.slice(0, 4);
            const month = dateString.slice(4, 6);
            const day = dateString.slice(6, 8);
            return `${day}/${month}/${year}`;
        }

        const stringToDate = (date)  => {           

            return format.parse({value: date, type: format.Type.DATE});
        }

        const convertHoursToTime = (hours)  => { 
            // Convert hours to total minutes
            let totalMinutes = Math.round(hours * 60);
        
            // Calculate hours and minutes
            let hoursPart = Math.floor(totalMinutes / 60);
            let minutesPart = totalMinutes % 60;
        
            // Format the time duration as HH:mm
            let formattedTime = `${hoursPart}:${minutesPart.toString().padStart(2, '0')}`;
            log.debug('convertHoursToTime formattedTime', formattedTime)
            return formattedTime;
        }

        const splitArrayIntoChunks = (array, chunkSize)  => { 
            let result = [];
            for (let i = 0; i < array.length; i += chunkSize) {
                result.push(array.slice(i, i + chunkSize));
            }
            return result;
        }

        return {getInputData, map, reduce, summarize}

    });




