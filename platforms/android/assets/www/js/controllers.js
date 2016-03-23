angular.module('starter.controllers', ['firebase'])

        .controller('LoginCtrl', function ($scope, auth, $state, store, $firebase) {

            auth.signin({
                closable: false,
                // This asks for the refresh token
                // So that the user never has to log in again
                authParams: {
                    scope: 'openid offline_access'
                }
            }, function (profile, idToken, accessToken, state, refreshToken) {
                store.set('profile', profile);
                store.set('token', idToken);
                store.set('refreshToken', refreshToken);
                $scope.pro = store.get('profile');
                var a = 'https://marone.firebaseio.com/users/' + $scope.pro['user_id'];
                var ref = new Firebase(a);
                var sync = $firebase(ref);
                sync.$update({// updates email and name in firebase on login
                    userdetails: {
                        email: $scope.pro['email'],
                        name: $scope.pro['nickname']
                    }
                });
                $state.go('tab.dash');
            }, function (error) {
                console.log("There was an error logging in", error);
            });

            //update username and name on dashboard visit

        })


        .controller('DashCtrl', function ($scope, $http, link, $filter, store, $firebase, $ionicModal, $interval, $ionicPlatform, $rootScope, $ionicPopup, $ionicLoading) {
            document.addEventListener('deviceready', function () {

                $scope.pro = store.get('profile');
                var a = 'https://marone.firebaseio.com/users/' + $scope.pro['user_id'];
                var ref = new Firebase(a);
                var sync = $firebase(ref);
                var a1 = link.all();
                var act_log = $firebase(ref.child("activity"));
                act_log.$push($scope.curr_date + " " + $scope.curr_time + " Opened Dashboard ");    //window open event logging
                var ude = $firebase(ref.child('meds')).$asObject();
                var udelength = 0;
                ude.$loaded().then(function () {
                    angular.forEach(ude, function (udd) {
                        udelength++;
                    });
                });
                var breaker = false;
                //to show badge on tabs
                // $rootScope.badgeCount = a1.notif;
                // Start the timer
                $ionicLoading.show({// shows load screen till all meds are created/loaded
                    content: 'Loading',
                    animation: 'fade-in',
                    showBackdrop: true,
                    maxWidth: 200,
                    showDelay: 0
                });

                $scope.curr_time = $filter('date')(new Date(), 'HH:mm:ss');
                $interval(tick1, 20000);

                // get users medication list
                var userdet = $firebase(ref.child('meds')).$asArray();
                var a = $firebase(ref.child('daily_log')).$asArray();
                var maindata = $firebase(ref.child('userdetails')).$asObject();
                $scope.mymed = userdet;
                $scope.daily_log = a;

                //----------------daily auto log updater------------------------
                var m = $firebase(ref.child('userdetails'));
                var tod = $filter('date')(new Date(), 'EEE');
                var today = tod.toString();
                //--------------------------------------------------------------

                //----------------deletes duplicate entries---------------------
                var b = $firebase(ref.child('daily_log'));
                a.$loaded().then(function () {
                    var i = 0;
                    var object = [];
                    var object2 = [];
                    var temp_id = null;
                    angular.forEach(a, function (x) {
                        if (x.date == $scope.curr_date)
                        {
                            object.push(x);
                        }
                    });

                    angular.forEach(object, function (y) {
                        var q = 0;
                        if (temp_id == null) {
                            angular.forEach(object, function (z) {
                                if (y.med_id == z.med_id && y.time == z.time && y.dl_id != z.dl_id) {
                                    temp_id = q;//object2.push(y.dl_id);
                                }
                                q++;
                            });
                        }
                    });
                    object2 = object.slice(0, temp_id);

                    angular.forEach(object2, function (z) {
                        b.$remove(z.dl_id);
                    });
                });
                //  gets todays medication list, finds the first duplicate entry having 
                //  same med id and time but duplicate dl_id and splices all entries uptill then 
                //--------------------------------------------------------------

                tick1(); // force function call on opening dashboard
                $rootScope.badgeCount = 0;
                function tick1() {     //periodically repeated function - handles every day dosage creation

                    if (a1.link != 'nothing') {     // checks what the "link" in firebase contains, 
                        // if nothing = dislpay no bagdge, if has google form link only then display badge                        
                        $rootScope.badgeCount = 1;
                    } else {
                        $rootScope.badgeCount = 0;
                    }
                    $scope.curr_date = $filter('date')(new Date(), 'yyyy-MM-dd');
                    $scope.curr_date_name = $filter('date')(new Date(), 'EEE');
                    $scope.curr_time = $filter('date')(new Date(), 'HH:mm:ss');
                    $scope.curr_hour = $filter('date')(new Date(), 'HH');


                    maindata.$loaded().then(function () {
                        //alert(maindata.name + '' + maindata.email + '' + maindata.ud_date);
                        // alert(maindata.ud_date + " __ " + today);
                        if (maindata.ud_date == today) {
                            $ionicLoading.hide();
                            // alert("in if");
                        } else {
                            $ionicLoading.show({
                                content: 'Loading',
                                animation: 'fade-in',
                                showBackdrop: true,
                                maxWidth: 200,
                                showDelay: 0
                            });
                            // var ude = $firebase(ref.child('meds')).$asObject();
                            //   alert("in else");
                            ude.$loaded().then(function () {
                                var day_log = $firebase(ref.child("daily_log"));
                                var zi = 0;
                                angular.forEach(ude, function (value) {
                                    zi++;
                                    if (zi <= udelength && breaker == false) {

                                        if (zi == udelength) {

                                            breaker = true;
                                        }

                                        var data = {
                                            med_id: value.med_id,
                                            med_name: value.med_name,
                                            date: $filter('date')(new Date(), 'yyyy-MM-dd'),
                                            time: $filter('date')(new Date(), 'HH:mm:ss'),
                                            amount_taken: 0,
                                            status: "no_entry",
                                            day: $filter('date')(new Date(), 'EEE')
                                        };
                                        angular.forEach(value.schedule, function (sch) {
                                            var hours = 0;
                                            angular.forEach(sch.days, function (a, b) {
                                                //alert(a+ ' ' + b);
                                                if (a) {
                                                    var c = $filter('date')(new Date(), 'EEE');
                                                    if (b == c.toString()) {
                                                        day_log.$push(data).then(function (ref) {
                                                            ref.key(); // key for the newly created record
                                                            var adata = {
                                                                dl_id: ref.key(),
                                                                time: sch.sch_time
                                                            };

                                                            day_log.$update(ref.key(), adata);
                                                        });




                                                        if (value.repeat == "yes") {
                                                            for (var j = 1; j < sch.stopafter; j++) {
                                                                hours = hours + parseInt(sch.every);
                                                                var time = sch.sch_time;
                                                                var time1 = time.split(":");
                                                                if (parseInt(time1[0]) + hours >= 24) {
                                                                    break;
                                                                } else {
                                                                    var time = sch.sch_time;
                                                                    if (parseInt(time1[0]) < 10) {
                                                                        var timeapend = "0" + (parseInt(time1[0]) + parseInt(hours)) + ":" + time1[1];
                                                                    } else {
                                                                        var timeapend = (parseInt(time1[0]) + parseInt(hours)) + ":" + time1[1];
                                                                    }
                                                                    //alert(parseInt(time1[0]) + parseInt(hours));
                                                                    var adata = {
                                                                        med_id: value.med_id,
                                                                        med_name: value.med_name,
                                                                        date: $filter('date')(new Date(), 'yyyy-MM-dd'),
                                                                        time: timeapend,
                                                                        amount_taken: 0,
                                                                        status: "no_entry",
                                                                        day: $filter('date')(new Date(), 'EEE')
                                                                    };
                                                                    repeatschrd(adata);
                                                                }
                                                            }
                                                        }
                                                    }
                                                }//if ends
                                            });//for loop - days

                                        });//for loop - schedule 
//                                        m.$update({
//                                            ud_date: tod
//                                        });
                                        $scope.daychange();
                                        function repeatschrd(adata) {           //if medication has interval based schedule
                                            day_log.$push(adata).then(function (ref) {
                                                ref.key(); // key for the newly created record
                                                //var time1 = time.split(":");
                                                var cdata = {
                                                    dl_id: ref.key()
                                                };
                                                day_log.$update(ref.key(), cdata);

                                            });
                                        }
                                    }
                                });
                            });
                            $ionicLoading.hide();
                        }
                    });
                }


                $scope.daychange = function () {        //updates todays date 
                    m.$update({
                        //ud_date: "tod"
                        ud_date: $filter('date')(new Date(), 'EEE')
                    });
                    $ionicLoading.hide();
                };
                //----------
                //----------------daily auto log updater----------------------------------------------------


                $scope.haha = function (the_Med) { //the_Med is from users/med/log/
                    var da_log = $firebase(ref.child("daily_log"));
                    var up = $firebase(ref.child("meds").child(the_Med.med_id));
                    if (the_Med.log_count) {
                        var count = the_Med.log_count;
                    }
                    else {
                        count = 0;
                    }
                    var minus = the_Med.med_left;
                    $scope.openModal('My Schedule');
                    $scope.log = {date: $scope.curr_date, time: $scope.curr_time, status: "missed"}; // to catch user medical log data
                    act_log.$push($scope.curr_date + " " + $scope.curr_time + " " + the_Med.med_name + " opened");
                    $scope.take_med = function () {
                        count = count + 1;
                        if ($scope.log['status'] == "missed" || $scope.log['status'] == "dont_know") {
                            $scope.log['amount_taken'] = 0;
                        } else {
                            minus = the_Med.med_left - $scope.log['amount_taken'];
                            $scope.log['points'] = 5;
                        }
                        var aila;
                        da_log.$push($scope.log).then(function (ref) {
                            aila = ref.key(); // key for the newly created record
                            var data = {
                                med_id: the_Med.med_id,
                                med_name: the_Med.med_name,
                                dl_id: aila
                            };
                            //  alert(aila);
                            da_log.$update(ref.key(), data);
                        });
                        up.$update({
                            log_count: count,
                            med_left: minus
                        }); // update fields in firebase
                        $scope.closeModal();
                    }; //beammeup ends
                }; //haha ends


                $scope.Update_LOG = function (the_Med) {
                    $scope.closeModal1("");
                    $scope.openModal('due / log history');
                    //var sch = $firebase(ref.child("meds").child(the_Med.med_id).child("log"));
                    var da_log = $firebase(ref.child("daily_log"));
                    var up = $firebase(ref.child("meds").child(the_Med.med_id));
                    $scope.med_l = $firebase(ref.child("meds").child(the_Med.med_id)).$asObject();
                    $scope.formodal = the_Med;
                    var count = the_Med.log_count;
                    var minus;
                    $scope.log = {
                        date: the_Med.date,
                        time: $scope.curr_time,
                        status: "missed"
                    }; // to catch user medical log data
                    // var medleft  = $firebase(ref.child("daily_log").child()).$asArray();
                    var t1 = $scope.curr_time.split(":");
                    var t2 = the_Med.time.split(":");
                    var t3 = parseInt(t1[0]) - parseInt(t2[0]);
                    t3 = Math.abs(t3);
                    act_log.$push($scope.curr_date + " " + $scope.curr_time + " " + the_Med.med_name + " opened");
                    $scope.take_med = function () {
                        if ($scope.log['status'] == "missed" || $scope.log['status'] == "dont_know") {
                            $scope.log['amount_taken'] = 0;
                            minus = $scope.med_l.med_left + the_Med.amount_taken; //no med left
                        } else {

                            minus = $scope.med_l.med_left - $scope.log['amount_taken'];
                            if (t3 == 1 || t3 == 0) {
                                $scope.log['points'] = 10;
                            }
                            else if (t3 > 1) {
                                $scope.log['points'] = 5;
                            }
                        }

                        da_log.$update(the_Med.dl_id, $scope.log); // cant update without key value of daily_log
                        // sch.$update(x.count, $scope.log); // update new record to firebase
                        up.$update({med_left: minus}); // update fields in firebase


                        $scope.closeModal();
                    }; //beammeup ends

                }; //Update_LOG ends






                $ionicPlatform.registerBackButtonAction(function (e) {
                    if ($rootScope.$viewHistory.backView) {
                        $rootScope.$viewHistory.backView.go();
                    } else {
                        var confirmPopup = $ionicPopup.confirm({
                            title: 'Confirm Exit',
                            template: "Are you sure you want to close MAR?"
                        });
                        confirmPopup.then(function (close) {
                            if (close) {
                                act_log.$push($scope.curr_date + " " + $scope.curr_time + " APP CLOSED ");
                                // there is no back view, so close the app instead
                                ionic.Platform.exitApp();
                            } // otherwise do nothing
                            console.log("User canceled exit.");
                        });
                    }

                    e.preventDefault();
                    return false;
                }, 101); // 1 more priority than back button






                $ionicModal.fromTemplateUrl('templates/dash_med_log_detail.html', {
                    scope: $scope,
                    animation: 'slide-in-up'
                }).then(function (modal) {
                    $scope.modal = modal;
                });
                $scope.openModal = function (from) {
                    act_log.$push($scope.curr_date + " " + $scope.curr_time + " medicine log window clicked " + from);
                    $scope.modal.show();
                };
                $scope.closeModal = function () {
                    act_log.$push($scope.curr_date + " " + $scope.curr_time + " medicine log window closed");
                    $scope.modal.hide();
                };
                //Cleanup the modal when we're done with it!
                $scope.$on('$destroy', function () {
                    $scope.modal.remove();
                });
                // Execute action on hide modal
                $scope.$on('modal.hidden', function () {
                    // Execute action
                });
                // Execute action on remove modal
                $scope.$on('modal.removed', function () {
                    // Execute action
                });
                $ionicModal.fromTemplateUrl('templates/log_history.html', {
                    scope: $scope,
                    animation: 'slide-in-down'
                }).then(function (modal) {
                    $scope.modal1 = modal;
                });
                $scope.openModal1 = function () {
                    act_log.$push($scope.curr_date + " " + $scope.curr_time + " LOG HISTORY clicked ");
                    $scope.modal1.show();
                };
                $scope.closeModal1 = function (from) {
                    act_log.$push($scope.curr_date + " " + $scope.curr_time + " " + from + " closed ");
                    $scope.modal1.hide();
                };
                //Cleanup the modal when we're done with it!
                $scope.$on('$destroy', function () {
                    $scope.modal1.remove();
                });
                // Execute action on hide modal
                $scope.$on('modal.hidden', function () {
                    // Execute action
                });
                // Execute action on remove modal
                $scope.$on('modal.removed', function () {
                    // Execute action
                });
            }, false);
        })
//--------------------------------------------------------------------------------------------------------------
        .controller('FriendsCtrl', function ($scope, $rootScope, $http, $filter, store, $firebase, link, $timeout) {
            $scope.pro = store.get('profile');
            var a = 'https://marone.firebaseio.com/users/' + $scope.pro['user_id'];
            var ref = new Firebase(a);
            var sync = $firebase(ref);
            var point_counter = 0;
            var firelog = $firebase(ref.child('daily_log')).$asObject();
            var rewards = 0;
            var act_log = $firebase(ref.child("activity"));
            act_log.$push($scope.curr_date + " " + $scope.curr_time + " Reward tab opened ");

            firelog.$loaded().then(function () {
                angular.forEach(firelog, function (x) {
                    if (!isNaN(parseInt(x.points))) {
                        rewards = rewards + parseInt(x.points);
                        $scope.rewards1 = rewards;
                    }
                    point_counter = point_counter + 1;
                    $scope.p_c = point_counter;
                });
                $scope.p_c1 = ((rewards / $scope.p_c) * 10).toFixed(2);
                $scope.p_c2 = (rewards / ($scope.p_c));

                updatepoints();
            });
            function updatepoints() {
                var pointlog = $firebase(ref.child("points"));
                $firebase(ref.child("points")).$update({
                    "point": $scope.rewards1,
                    "outof": $scope.p_c,
                    "reward": $scope.p_c2,
                    "reward shown": $scope.p_c1
                });
            }


            var a1 = link.all();
            $scope.asdf = a1.link;

            $scope.OpenLink = function () {
                act_log.$push($scope.curr_date + " " + $scope.curr_time + " Form window opened ");
                var haystack = a1.link;
                var index = haystack.indexOf("https://docs.google.com");
                if (index > -1) {
                    // alert(index);
                    window.open(a1.link, "_system");
                }
                else{
                    // alert("not a link");
                }
            };
        })

        .controller('FriendDetailCtrl', function ($scope, $stateParams, Friends) {
            $scope.friend = Friends.get($stateParams.friendId);
        })

        .controller('AccountCtrl', function ($scope, auth, $state, store, $firebase, meds, $ionicModal) {

            $scope.pro = store.get('profile');
            $scope.firevar = meds.all();
            var a = 'https://marone.firebaseio.com/users/' + $scope.pro['user_id'] + '/meds/';
            var ref = new Firebase(a);
            var a1 = 'https://marone.firebaseio.com/users/' + $scope.pro['user_id'];
            var ref1 = new Firebase(a1);
            var sync = $firebase(ref);
            $scope.selection1 = sync.$asArray();
            //medication selection modal
            var act_log = $firebase(ref1.child("activity"));
            act_log.$push($scope.curr_date + " " + $scope.curr_time + " Account tab opened ");

            $scope.toggleSelection = function toggleSelection(pill_id, pill_name, pill_checked) {
                var idx = $scope.selection1.indexOf(pill_name);
                // is currently selected
                if (idx > -1) {
                    //$scope.selection.splice(idx, 1);
                }
                // is newly selected
                else {
                    if (pill_checked) {
                        $firebase(ref.child(pill_id)).$update({
                            "med_id": pill_id,
                            "med_name": pill_name,
                            "total_med": 0,
                            "log_count": 0,
                            "med_left": 0
                        });
                    } else {
                        sync.$remove(pill_id);
                    }
                }


                //alert($scope.selection);
            };
            $scope.newmedhold = {};
            $scope.newmedicine = function () {

                var newmedurl = 'https://marone.firebaseio.com/Medicines/';
                var qwee = new Firebase(newmedurl);
                var newmedref = $firebase(qwee);
                if ($scope.newmedhold.name != "") {
                    newmedref.$push($scope.newmedhold).then(function (loll) {
                        act_log.$push($scope.curr_date + " " + $scope.curr_time + " new med added :  " + $scope.newmedhold.name);

                        loll.key(); // key for the newly created record
                        var data = {
                            id: loll.key()
                        };
                        newmedref.$update(loll.key(), data);
                        $scope.newmedhold = {
                            name: ""
                        };
                    });
                }
            };
            $scope.temp = [];
            //Medication delete button in settings page
            $scope.del = function del(pill_id) {
                act_log.$push($scope.curr_date + " " + $scope.curr_time + " med removed, Pill id: " + pill_id);
                sync.$remove(pill_id);
            };
            //Medication edit button in settings page
            $scope.edit = function edit(pill_id) {
                $scope.pillid = pill_id;
                $scope.openModal1();
                $scope.edit_refill = function edit_refill(refill) {

                    $scope.temp = angular.copy(refill);
                    // alert(pill_id + ' :  ' + $scope.temp + ' :  ' + $scope.temp.refill_data);
                    $firebase(ref.child(pill_id)).$update({
                        "total_med": $scope.temp.refill_data,
                        "med_left": $scope.temp.refill_data
                    });
                    $scope.getDatetime = new Date;
                    $firebase(ref.child(pill_id + "/refill/" + $scope.getDatetime)).$update({
                        "refill_date": $scope.getDatetime,
                        "refill_quantitiy": $scope.temp.refill_data

                    });
                };
                var sch = $firebase(ref.child($scope.pillid).child("schedule"));
                var sch1 = $firebase(ref.child($scope.pillid));
                $scope.schedule = sch.$asArray();
                $scope.del_schedule = function (med) {
                    act_log.$push($scope.curr_date + " " + $scope.curr_time + " med schedule removed, Pill id: " + pill_id);
                    sch.$remove(med['sch_id']);
                };
                $scope.week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                $scope.selection = {
//                    days:{
//                        "Sun":false,
//                    "Mon":false,
//                    "Tue":false,
//                    "Wed":false,
//                    "Thurs":false,
//                    "Fri":false,
//                    "sat":false  }

                };
                $scope.add = function () {
                    sch.$push($scope.selection).then(function (ref) {
                        ref.key();
                        sch.$update(ref.key(), {
                            "sch_id": ref.key()
                        });
                    });

                    if ($scope.selection['every'] != null) {
                        sch1.$update({"repeat": "yes"});
                    }
                    $scope.closeModal1();
                    $state.transitionTo($state.current, $state.$current.params, {
                        reload: true,
                        inherit: false,
                        notify: true
                    });
                };
            };
            $ionicModal.fromTemplateUrl('templates/add_med.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function (modal) {
                $scope.modal = modal;
            });
            $scope.openM = function () {
                act_log.$push($scope.curr_date + " " + $scope.curr_time + " Add medicine window opened ");
                $scope.modal.show();
            };
            $scope.closeM = function () {
                act_log.$push($scope.curr_date + " " + $scope.curr_time + " Add medicine window closed ");
                $scope.modal.hide();
            };
            //Cleanup the modal when we're done with it!
            $scope.$on('$destroy', function () {
                $scope.modal.remove();
            });
            // Execute action on hide modal
            $scope.$on('modal.hidden', function () {
                // Execute action
            });
            // Execute action on remove modal
            $scope.$on('modal.removed', function () {
                // Execute action
            });
            $ionicModal.fromTemplateUrl('templates/add_med_detail.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function (modal) {
                $scope.modal1 = modal;
            });
            $scope.openModal1 = function () {
                act_log.$push($scope.curr_date + " " + $scope.curr_time + " med timings window opened ");
                $scope.modal1.show();
            };
            $scope.closeModal1 = function () {
                act_log.$push($scope.curr_date + " " + $scope.curr_time + " med timings window closed");
                $scope.modal1.hide();
            };
            //Cleanup the modal when we're done with it!
            $scope.$on('$destroy', function () {
                $scope.modal1.remove();
            });
            // Execute action on hide modal
            $scope.$on('modal.hidden', function () {
                // Execute action
            });
            // Execute action on remove modal
            $scope.$on('modal.removed', function () {
                // Execute action
            });
//            $scope.friends = Friends.all();
            $scope.logout = function () {
                act_log.$push($scope.curr_date + " " + $scope.curr_time + " Logged out");
                auth.signout();
                store.remove('token');
                store.remove('profile');
                store.remove('refreshToken');
                $state.go('login');
            };
        })
        ;
