/* Copyright start
  Copyright (C) 2008 - 2023 Fortinet Inc.
  All rights reserved.
  FORTINET CONFIDENTIAL & FORTINET PROPRIETARY SOURCE CODE
  Copyright end */
'use strict';
(function () {
  angular
    .module('cybersponse')
    .controller('feedback100Ctrl', feedback100Ctrl);

  feedback100Ctrl.$inject = ['$scope', 'licenseService', '$resource', 'connectorService', '$q', '$http', 'playbookService', '$timeout', 'API', 'Upload', 'ALL_RECORDS_SIZE', 'toaster'];

  function feedback100Ctrl($scope, licenseService, $resource, connectorService, $q, $http, playbookService, $timeout, API, Upload, ALL_RECORDS_SIZE, toaster) {
    $scope.issueType = 'Platform';
    $scope.installedContents = {};
    $scope.configurations = ['SMTP', 'Exchange'];
    $scope.category = [{ name: 'Connector', type: 'connector' }, { name: 'Solution Pack', type: 'solutionpack' }, { name: 'Widget', type: 'widget' }, { name: 'Platform', type: 'platform' }, { name: 'Performance', type: 'performance' }, { name: 'Documentation', type: 'documentation' }]
    $scope.sendVia = 'SMTP';
    $scope.contentLoaded = true;
    $scope.playbookTriggered = true;
    $scope.uploadedFile = null;
    $scope.uploadedFileFlag = null;
    $scope.email = { description: '' };
    $scope.email = { subject: '' };
    $scope.selectedCategory = {
      selectedCategory: ''
    };
    $scope.installedContent = {
      solution: '',
      version: ''
    };
    $scope.user = {
      fullName: ''
    };
    $scope.user = {
      emailId: ''
    };
    $scope.connectorHealthStatus = { 'exchange': true, 'smtp': true };
    $scope.onChangeMode = onChangeMode;
    $scope.submit = submit;
    $scope.triggerPlaybook = triggerPlaybook;
    $scope.categoryChanged = categoryChanged;
    // $scope.uploadFile = uploadFile;
    // $scope.checkWordCount = checkWordCount;


    init();
    function init() {
      licenseService.getLicenseDetails().then(function (license) {
        $scope.licenseSerialNumber = license.node.details.serial_no;
      });
      var connectorNames = ['exchange', 'smtp'];
      // Loop through each connector name and call connectorHealthCheck
      connectorNames.forEach(function (connectorName) {
        connectorHealthCheck(connectorName)
          .then(function (healthStatus) {
            // Assign the boolean value to the connector name in the object
            $scope.connectorHealthStatus[connectorName] = healthStatus;
            // You can perform further actions or logging here if needed
          })
          .catch(function (error) {
            console.error(`Error checking health for ${connectorName}:`, error);
          });
      });
    }

    $scope.uploadFiles = function (file) {
      // Filter out folders from the selected files
      if (file.size < 25072682) {
        if (file.type) {
          file.upload = Upload.upload({
            url: API.BASE + 'files',
            data: {
              file: file
            }
          });
          $scope.loadingJob = true;

          file.upload.then(function (response) {
            $scope.fileIRI = response.data;
            $scope.loadingJob = false;
            $scope.uploadedFileFlag = true;
          },
            function (response) {
              $scope.loadingJob = false;

              if (response.status > 0) {
                $log.debug(response.status + ': ' + response.data);
              }
              var message = 'Upload failed. Please try again.';
              if (response.status === 413) {
                message = 'File exceeds the maximum size.';
              }
              toaster.error({ body: message});
            });
        }
      }
      else {
        toaster.error({ body: 'File size exceeded limit, please try again' });
      }

    }

    function submit() {
      if ($scope.submitFormWidget.$invalid) {
        $scope.submitFormWidget.$setTouched();
        $scope.submitFormWidget.$focusOnFirstError();
        return;
      }
      triggerPlaybook();
    }

    function onChangeMode() {
      if ($scope.sendVia === 'Exchange') {
        $scope.sendVia = 'SMTP';
      }
      else {
        $scope.sendVia = 'Exchange';
      }
    }

    function categoryChanged() {
      if ($scope.selectedCategory.selectedCategory === 'widget' || $scope.selectedCategory.selectedCategory === 'solutionpack' || $scope.selectedCategory.selectedCategory === 'connector') {
        $scope.contentLoaded = false;
        getInstalledContent().then(function (result) {
          $scope.installedContents = result;
          $scope.contentLoaded = true;
        });
      }
    }

    $scope.$on('popupClosed', function (event, data) {
      if (data === $scope.config.name + '_' + $scope.config.version) {
        //to destroy the listener for state change
        $scope.nextPage = false;
      }
    });




    function triggerPlaybook() {
      var queryPayload = returnParameters();
      queryPayload.request.data['emailBody'] = $scope.email.description;
      queryPayload.request.data['sendVia'] = $scope.sendVia;
      if ($scope.fileIRI && $scope.fileIRI['@id']) {
        queryPayload.request.data['fileIRI'] = $scope.fileIRI['@id'];
      }
      queryPayload.request.data['emailSubject'] = $scope.email.subject;
      queryPayload.request.data['fullName'] = $scope.user.fullName;
      queryPayload.request.data['category'] = $scope.selectedCategory.selectedCategory;
      queryPayload.request.data['installedContent'] = $scope.installedContent.solution.label + ' v' + $scope.installedContent.solution.version;
      queryPayload.request.data['serialNumber'] = $scope.licenseSerialNumber;
      queryPayload.request.data['emailId'] = $scope.user.emailId;
      var queryUrl = '/api/triggers/1/notrigger/a81bd4ae-f754-4644-aff4-29671e172645';
      $http.post(queryUrl, queryPayload).then(function (result) {
        $scope.playbookTriggered = false;
        if (result && result.data && result.data.task_id) {
          playbookService.checkPlaybookExecutionCompletion([result.data.task_id], function (response) {
            if (response && (response.status === 'finished' || response.status === 'failed')) {
              playbookService.getExecutedPlaybookLogData(response.instance_ids).then(function (res) {
                if (res.result.status === 'Success') {
                  $scope.playbookTriggered = true;
                  $scope.nextPage = true;
                  const customModal = document.getElementById('custom-modal');
                  $timeout(function () {
                    $scope.nextPage = false;
                    customModal.setAttribute('style', 'display:none;');
                  }, 2000);
                  defer.resolve({
                    result: res.result,
                    status: response.status
                  });
                }
                else {
                  const customModal = document.getElementById('custom-modal');
                  $timeout(function () {
                    $scope.nextPage = false;
                    customModal.setAttribute('style', 'display:none;');
                  }, 2000);
                  $scope.nextPage = false;
                  defer.reject('Playbook failed');
                }
              }, function (err) {
                const customModal = document.getElementById('custom-modal');
                $timeout(function () {
                  $scope.nextPage = false;
                  customModal.setAttribute('style', 'display:none;');
                }, 2000);
                $scope.nextPage = false;
                defer.reject(err);
                $scope.playbookError = true;
              });
            }
          }, function (error) {
            const customModal = document.getElementById('custom-modal');
            $timeout(function () {
              $scope.nextPage = false;
              customModal.setAttribute('style', 'display:none;');
            }, 2000);
            $scope.nextPage = false;
            defer.reject(error);
            $scope.playbookError = true;
          }, $scope);
        }
      }, function (err) {
        defer.reject(err);
      });
    }

    function minimizeModal(){
      const customModal = document.getElementById('custom-modal');
      $timeout(function () {
        $scope.nextPage = false;
        customModal.setAttribute('style', 'display:none;');
      }, 2000);
    }

    function connectorHealthCheck(connectorName) {
      return $resource('api/integration/connectors/?name=' + connectorName)
        .get()
        .$promise
        .then(function (connectorMetaDataForVersion) {
          return connectorService.getConnector(connectorName, connectorMetaDataForVersion.data[0].version);
        })
        .then(function (connectorMetaData) {
          if (connectorMetaData.configuration && connectorMetaData.configuration.length > 0) {
            var promises = connectorMetaData.configuration.map(function (configs) {
              return connectorService.getConnectorHealth(connectorMetaData, configs.config_id)
                .then(function (configurationDetails) {
                  return configurationDetails.status === 'Available';
                });
            });
            // Use Promise.all to wait for all promises to resolve
            return Promise.all(promises)
              .then(function (results) {
                // If any result is true, set connectorHealthCheckFlag to true
                return results.some(Boolean);
              });
          } else {
            return false;
          }
        })
        .catch(function (error) {
          console.error("Error in getConnector or getConnectorHealth:", error);
          return false;
        });
    }

    function returnParameters() {
      return {
        'input': {},
        'request': {
          'data': {
            'records': [],
          }
        },
        'useMockOutput': false,
        'globalMock': false,
        'force_debug': true
      };
    }

    function getInstalledContent() {
      var defer = $q.defer();
      var queryObject = queryToGetInstalledContent();

      let appendQueryString = 'solutionpacks?$limit=' + ALL_RECORDS_SIZE;

      $http.post(API.QUERY + appendQueryString, queryObject).then(function (response) {
        defer.resolve(response.data['hydra:member']);
      }, function (error) {
        defer.reject(error);
      });
      return defer.promise;
    }

    function queryToGetInstalledContent() {
      return {
        "sort": [
          {
            "field": "label",
            "direction": "ASC"
          }
        ],
        "page": 1,
        "limit": 30,
        "logic": "AND",
        "filters": [
          {
            "field": "type",
            "operator": "in",
            "value": [
              $scope.selectedCategory.selectedCategory
            ]
          },
          {
            "field": "installed",
            "operator": "eq",
            "value": true
          },
          {
            "field": "development",
            "operator": "eq",
            "value": false
          }
        ]
      }
    }
  }
})();
