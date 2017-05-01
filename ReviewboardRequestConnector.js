(function() {
     //
     // Helper functions
     //

     

     function getNextUrl(iteration) {
        var start = iteration*200;
         var url = "http://reviewboard/api/review-requests/" + "?start="+ start +"&max-results=200";
        return url;
     }

     //
     // Connector definition
     // 
     var myConnector = tableau.makeConnector();

     myConnector.getSchema = function(schemaCallback) {
           var schema = [];
             var cols = [
                 { id: "index", alias: "index", dataType: tableau.dataTypeEnum.float },
                 { id: "summary", alias: "summary", dataType: tableau.dataTypeEnum.string },
                 { id: "link", alias: "link", dataType: tableau.dataTypeEnum.string },
                 { id: "submitter", alias: "submitter", dataType: tableau.dataTypeEnum.string },
                 { id: "Time_added", alias: "Time_added", dataType: tableau.dataTypeEnum.date },
                 { id: "lastUpdated", alias: "Last_Updated", dataType: tableau.dataTypeEnum.date },
                 { id: "Issue_Open", alias: "Issue_Open_Count", dataType: tableau.dataTypeEnum.float },
                 { id: "Issue_Resolved", alias: "Issue_Resolved_Count", dataType: tableau.dataTypeEnum.float },
                 { id: "Ship_It_Count", alias: "Ship_It_Count", dataType: tableau.dataTypeEnum.float },
                 { id: "Target_People", alias: "Target_People", dataType: tableau.dataTypeEnum.string },
                 { id: "Target_Group", alias: "Target_Group", dataType: tableau.dataTypeEnum.string }
             ];

             var tableInfo = {
                 id: "Reviewboard_Request",
                 alias: "Reviewboard all pending request",
                 columns: cols
             };

             schema.push(tableInfo);


         schemaCallback(schema); // tell tableau about the fields and their types
     };

     myConnector.getData = function(table, doneCallback) {
         var endDate = new Date();
         var startDate = new Date();
         
         // set the start of the range to be 1 year ago
         startDate.setYear(endDate.getFullYear() - 1);
         
         var reviewboardname = table.tableInfo.id;

         var url = "http://reviewboard/api/review-requests/" + "?start=0&max-results=200";
         var connectionUrl = url;
         var APIPromise = makeAPIRequest(table, reviewboardname, connectionUrl); // Key and ticker are the same

         APIPromise.then(function(response) {
             console.log("Success");
             doneCallback();
         }, function(error) {
             console.error(error);
         });
     };

     function getTargetList(peopleList) {
            var targer_people = [];
            for(var a = 0; a< peopleList.length; a++) {
                targer_people.push(peopleList[a].title);
            }
            return targer_people;
     }

     function makeAPIRequest(table, reviewboardname, connectionUrl) {

            $.ajaxSetup({
                headers: {
                 'Authorization': "Basic " + btoa(tableau.username + ":" + tableau.password)
                }
            });

         return new Promise(function(resolve, reject) {
             var xhr = $.ajax({
                 url: connectionUrl,    //"http://localhost:8889/reviewboard/api/groups/Recommendations_Team/users/",
                 dataType: 'json',
                 success: function(data) {
                    console.log(data)
                     if (data.review_requests.length>0) {
                         var review_requests = data.review_requests
                         var toRet = [];
                         var total_results = data.total_results;
                         // mash the data into an array of objects
                         var i = 0;
                         for ( i = 0; i < review_requests.length; i++) {
                                     var entry = {
                                     "index": i,
                                     "summary": review_requests[i].summary, 
                                     "link": review_requests[i].absolute_url, 
                                     "submitter": review_requests[i].links.submitter.title,
                                     "Time_added": review_requests[i].time_added,                   
                                     "lastUpdated": review_requests[i].last_updated,
                                     "Ship_It_Count": review_requests[i].ship_it_count,
                                     "Issue_Resolved": review_requests[i].issue_resolved_count,
                                     "Issue_Open": review_requests[i].issue_open_count,
                                     "Target_People": getTargetList(review_requests[i].target_people).join(),
                                     "Target_Group": getTargetList(review_requests[i].target_groups).join()
                                 };
                                     toRet.push(entry);
                            }

                         table.appendRows(toRet);
                         console.log(data.links.next.href)
                         var counter = 0;
                         var iterations = (total_results/200)-1;
                         console.log(iterations);
                         console.log(total_results);

                         while( counter < iterations) {
                            console.log(i);
                                counter++;
                                var next = $.ajax({
                                             url: getNextUrl(counter),  
                                             dataType: 'json',
                                             success: function(data) {
                                                console.log(data)
                                                 if (data.review_requests.length>0) {
                                                     var review_requests = data.review_requests
                                                     var toRet = [];
                                                     // mash the data into an array of objects
                                                     for (var a = 0; a < review_requests.length; a++) {
                                                                 
                                                                 var entry = {
                                                                 "index": i,
                                                                 "summary": review_requests[a].summary, 
                                                                 "link": review_requests[a].absolute_url, 
                                                                 "submitter": review_requests[a].links.submitter.title,
                                                                 "Time_added": review_requests[a].time_added,                   
                                                                 "lastUpdated": review_requests[a].last_updated,
                                                                 "Ship_It_Count": review_requests[a].ship_it_count,
                                                                 "Issue_Resolved": review_requests[a].issue_resolved_count,
                                                                 "Issue_Open": review_requests[a].issue_open_count,
                                                                "Target_People": getTargetList(review_requests[a].target_people).join(),
                                                                "Target_Group": getTargetList(review_requests[a].target_groups).join()
                                                             };
                                                                 i++;
                                                                 toRet.push(entry);
                                                        }

                                                     table.appendRows(toRet);
                                                     resolve();
                                                 } else {
                                                     Promise.reject("No results found for reviewboard");
                                                 }
                                             },
                                             error: function(next, ajaxOptions, thrownError) {
                                                 Promise.reject("error connecting to reviewboard: " + thrownError);
                                             }
                                         });
                            }
                         

                                




                         resolve();
                     } else {
                         Promise.reject("No results found for reviewboard");
                     }
                 },
                 error: function(xhr, ajaxOptions, thrownError) {
                     Promise.reject("error connecting to reviewboard: " + thrownError);
                 }
             });
         });
     }

     setupConnector = function() {
         var username = $('#username').val().trim();
         var password = $('#password').val().trim();
         tableau.connectionData = username; // set the reviewboard username as the connection data so we can get to it when we fetch the data
         tableau.connectionName = 'reviewboard usernames: ' + username; // name the data source. This will be the data source name in Tableau
         tableau.password = password;
         tableau.username =  username;             
         tableau.submit();

     };

     tableau.registerConnector(myConnector);

     //
     // Setup connector UI
     //
     $(document).ready(function() {
         $("#submitButton").click(function() { // This event fires when a button is clicked
             setupConnector();
         });
     });
 })();
