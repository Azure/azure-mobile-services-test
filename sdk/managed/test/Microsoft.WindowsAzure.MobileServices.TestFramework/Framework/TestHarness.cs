﻿// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Xml.Linq;
using System.Threading.Tasks;

namespace Microsoft.WindowsAzure.MobileServices.TestFramework
{
    /// <summary>
    /// Harness for a test framework that allows asynchronous unit testing.
    /// </summary>
    public sealed class TestHarness
    {
        /// <summary>
        /// Initializes a new instance of the TestHarness class.
        /// </summary>
        public TestHarness()
        {
            this.Groups = new List<TestGroup>();
            this.Settings = new TestSettings();
            this.testRun = new TestRun();
            this.LogDump = new StringBuilder();
        }

        private TestRun testRun;
        /// <summary>
        /// Gets the list of test groups which contain TestMethods to execute.
        /// </summary>
        public IList<TestGroup> Groups { get; private set; }

        /// <summary>
        /// Gets the test settings used for this run.
        /// </summary>
        public TestSettings Settings { get; private set; }

        /// <summary>
        /// Gets or sets the TestReporter used to update the test interface as
        /// the test run progresses.
        /// </summary>
        public ITestReporter Reporter { get; set; }

        /// <summary>
        /// Gets the total number of test methods.
        /// </summary>
        /// <remarks>
        /// This is a simple helper to provide access to the total number of
        /// test methods which the Reporter can display.
        /// </remarks>
        public int Count
        {
            get { return this.Groups.SelectMany(g => g.Methods).Count(); }
        }

        /// <summary>
        /// Gets the number of test failures.
        /// </summary>
        public int Failures { get; set; }

        /// <summary>
        /// Get the number of tests already executed.
        /// </summary>
        public int Progress { get; private set; }

        /// <summary>
        /// Log Dump for individual tests
        /// </summary>
        public StringBuilder LogDump { get; set; }

        public string Platform { get; set; }
        /// <summary>
        /// Logs a message.
        /// </summary>
        /// <param name="message">The message.</param>
        public void Log(string message)
        {
            // Record the log to the LogDump only if the app is running in auto mode
            if (!Settings.ManualMode)
            {
                this.LogDump.AppendLine(message);
            }
            System.Diagnostics.Debug.WriteLine(message);
            this.Reporter.Log(message);

        }

        /// <summary>
        /// Load the tests from the given assembly.
        /// </summary>
        /// <param name="testAssembly">The assembly from which to load tests.</param>
        public void LoadTestAssembly(Assembly testAssembly)
        {
            LoadTestAssembly(this, testAssembly);
        }

        /// <summary>
        /// Filter out any test methods basd on the current settings.
        /// </summary>
        private int FilterTests()
        {
            // Create the list of filters (at some point we could make this
            // publicly accessible)
            List<TestFilter> filters = new List<TestFilter>();
            filters.Add(new FunctionalTestFilter(this.Settings));
            filters.Add(new TagTestFilter(this.Settings));

            // Apply any test filters to the set of tests before we begin
            // executing (test filters will change the Excluded property of
            // individual test methods)
            int originalCount = Count;
            foreach (TestFilter filter in filters)
            {
                filter.Filter(this.Groups);
            }
            int filteredCount = Count;
            if (filteredCount != originalCount)
            {
                this.Settings.TestRunStatusMessage += " - Only running " + filteredCount + "/" + originalCount + " tests";
            }
            return filteredCount;
        }

        /// <summary>
        /// Record the test metadata to the test run object at the start of the test run
        /// </summary>
        private void FillTestRunMetaData()
        {
            if (!Settings.ManualMode)
            {
                testRun.StartTime = DateTime.UtcNow;
                testRun.Tags.Add(Platform);
                testRun.Name = Platform + " " + Settings.Custom["RuntimeVersion"];
                testRun.VersionSpec.BranchName = Settings.Custom["RuntimeVersion"];
            }
        }

        /// <summary>
        /// Run the unit tests.
        /// </summary>
        public async void RunAsync()
        {
            // Ensure there's an interface to display the test results.
            if (this.Reporter == null)
            {
                throw new ArgumentNullException("Reporter");
            }

            /// Record the test metadata to the test run object at the start of the test run            
            FillTestRunMetaData();

            // Setup the progress/failure counters
            this.Progress = 0;
            this.Failures = 0;

            // Filter out any test methods based on the current settings
            int filteredTestCount = FilterTests();

            // get the actual count of tests going to run
            testRun.TestCount = filteredTestCount;

            // Write out the test status message which may be modified by the
            // filters
            Reporter.Status(this.Settings.TestRunStatusMessage);

            // Enumerators that track the current group and method to execute
            // (which allows reentrancy into the test loop below to resume at
            // the correct location).
            IEnumerator<TestGroup> groups = this.Groups.OrderBy(g => g.Name).GetEnumerator();
            IEnumerator<TestMethod> methods = null;

            // Keep a reference to the current group so we can pass it to the
            // Reporter's EndGroup (we don't need one for the test method,
            // however, because we close over in the continuation).
            TestGroup currentGroup = null;

            // Create daylight test run and get the run id
            string runId = String.Empty;
            if (!Settings.ManualMode)
            {
                runId = await TestLogger.CreateDaylightRun(testRun, Settings);
            }

            // Setup the UI
            this.Reporter.StartRun(this);

            // The primary test loop is a "recursive" closure that will pass
            // itself as the continuation to async tests.
            // 
            // Note: It's really important for performance to note that any
            // calls to testLoop only occur in the tail position.
            JObject sasResponseObject = null;
            DateTime RunStartTime = DateTime.UtcNow;
            Func<Task> testLoop = null;

            // Get the SAS token to upload the test logs to upload test logs to blob store
            if (!Settings.ManualMode && !String.IsNullOrEmpty(runId))
            {
                sasResponseObject = await TestLogger.GetSaSToken(Settings);

            }
            testLoop =
                async () =>
                {
                    if (methods != null && methods.MoveNext())
                    {
                        // If we were in the middle of a test group and there
                        // are more methods to execute, let's move to the next
                        // test method.

                        // Update the progress
                        this.Progress++;
                        Reporter.Progress(this);
                        // Start the test method
                        Reporter.StartTest(methods.Current);
                        if (methods.Current.Excluded)
                        {
                            // Ignore excluded tests and immediately recurse.
                            Reporter.EndTest(methods.Current);
                            await testLoop();
                        }
                        else
                        {
                            // Get the start time for individual tests
                            DateTime testStartTime = DateTime.UtcNow;

                            // Record the test result, upload the test log as a blob and clear the 
                            // log for next test
                            Func<Task> recordTestResult = async () =>
                            {
                                if (!Settings.ManualMode && !String.IsNullOrEmpty(runId))
                                {
                                    var log = new TestLogs()
                                    {
                                        LogLines = LogDump.ToString(),
                                        LogHash = Guid.NewGuid().ToString()
                                    };
                                    // record the test result
                                    var testResult = new TestResult()
                                    {
                                        FullName = methods.Current.Name,
                                        StartTime = testStartTime,
                                        EndTime = DateTime.UtcNow,
                                        Outcome = methods.Current.Passed ? "Passed" : "Failed",
                                        RunId = runId,
                                        Tags = new List<string> { Platform },
                                        Source = currentGroup.Name,
                                        Logs = sasResponseObject != null ? log : null
                                    };

                                    // upload test log to the blob store
                                    if (sasResponseObject != null)
                                        await TestLogger.UploadTestLog(log, sasResponseObject);

                                    // Add the test result to the test result collection, which will eventually 
                                    // be uploaded to daylight
                                    testRun.AddTestResult(testResult);
                                    LogDump.Clear();
                                }
                            };
                            // Execute the test method
                            methods.Current.Test.Start(
                                new ActionContinuation
                                {
                                    OnSuccess = async () =>
                                    {
                                        // Mark the test as passing, update the
                                        // UI, and continue with the next test.
                                        methods.Current.Passed = true;
                                        methods.Current.Test = null;
                                        Reporter.EndTest(methods.Current);
                                        await recordTestResult();
                                        await testLoop();
                                    },
                                    OnError = async (message) =>
                                    {
                                        // Mark the test as failing, update the
                                        // UI, and continue with the next test.
                                        methods.Current.Passed = false;
                                        methods.Current.Test = null;
                                        methods.Current.ErrorInfo = message;
                                        this.Failures++;
                                        System.Diagnostics.Debug.WriteLine(message);
                                        Reporter.Error(message);
                                        LogDump.AppendLine(message);
                                        Reporter.EndTest(methods.Current);
                                        await recordTestResult();
                                        await testLoop();
                                    }
                                });
                        }

                    }
                    else if (groups.MoveNext())
                    {
                        // If we've finished a test group and there are more,
                        // then move to the next one.

                        // Finish the UI for the last group.
                        if (currentGroup != null)
                        {
                            Reporter.EndGroup(currentGroup);
                            currentGroup = null;
                        }

                        // Setup the UI for this next group
                        currentGroup = groups.Current;
                        Reporter.StartGroup(currentGroup);

                        // Get the methods and immediately recurse which will
                        // start executing them.
                        methods = groups.Current.Methods.OrderBy(m => m.Name).GetEnumerator();
                        await testLoop();
                    }
                    else
                    {
                        if (!Settings.ManualMode && !String.IsNullOrEmpty(runId))
                        {
                            // post all the test results to daylight
                            await TestLogger.PostTestResults(testRun.TestResults.ToList(), Settings);

                            // String to store the test result summary of the entire suite
                            StringBuilder resultLog = new StringBuilder("Total Tests:" + filteredTestCount);
                            resultLog.AppendLine();
                            resultLog.AppendLine("Passed Tests:" + (filteredTestCount - Failures).ToString());
                            resultLog.AppendLine("Failed Tests:" + Failures);
                            resultLog.AppendLine("Detailed Results:" + Settings.Custom["DayLightUrl"] + "/" + Settings.Custom["DaylightProject"] + "/runs/" + runId);

                            var logs = new TestLogs()
                            {
                                LogLines = resultLog.ToString(),
                                LogHash = Guid.NewGuid().ToString()
                            };
                            // Record the the result of the entire test suite to master test run
                            var testResult = new TestResult()
                            {
                                FullName = Platform + " " + Settings.Custom["RuntimeVersion"],
                                Name = Platform + " " + Settings.Custom["RuntimeVersion"],
                                StartTime = RunStartTime,
                                EndTime = DateTime.UtcNow,
                                Outcome = Failures > 0 ? "Failed" : "Passed",
                                RunId = Settings.Custom["MasterRunId"],
                                Tags = new List<string> { Platform },
                                Source = "Managed",
                                Logs = sasResponseObject != null ? logs : null
                            };

                            // Upload the log of the test result summary for the test suite
                            if (sasResponseObject != null)
                                await TestLogger.UploadTestLog(logs, sasResponseObject);

                            // Post the test suite result to master run
                            await TestLogger.PostTestResults(new List<TestResult> { testResult }, Settings);
                        }
                        // Otherwise if we've finished the entire test run

                        // Finish the UI for the last group and update the
                        // progress after the very last test method.
                        Reporter.EndGroup(currentGroup);
                        Reporter.Progress(this);

                        // Finish the UI for the test run.
                        Reporter.EndRun(this);
                    }
                };

            // Start running the tests
            await testLoop();
        }

        private static void LoadTestAssembly(TestHarness harness, Assembly testAssembly)
        {
            Dictionary<Type, TestGroup> groups = new Dictionary<Type, TestGroup>();
            Dictionary<TestGroup, object> instances = new Dictionary<TestGroup, object>();
            foreach (Type type in testAssembly.ExportedTypes)
            {
                foreach (MethodInfo method in type.GetRuntimeMethods())
                {
                    if (method.GetCustomAttributes<TestMethodAttribute>().Any() ||
                            method.GetCustomAttributes<AsyncTestMethodAttribute>().Any())
                    {
                        TestGroup group = null;
                        object instance = null;
                        if (!groups.TryGetValue(type, out group))
                        {
                            group = CreateGroup(type);
                            harness.Groups.Add(group);
                            groups[type] = group;

                            instance = Activator.CreateInstance(type);
                            TestBase testBase = instance as TestBase;
                            if (testBase != null)
                            {
                                testBase.SetTestHarness(harness);
                            }

                            instances[group] = instance;
                        }
                        else
                        {
                            instances.TryGetValue(group, out instance);
                        }

                        TestMethod test = CreateMethod(type, instance, method);
                        group.Methods.Add(test);
                    }
                }
            }
        }

        private static TestGroup CreateGroup(Type type)
        {
            TestGroup group = new TestGroup();
            group.Name = type.Name;
            group.Tags.Add(type.Name);
            group.Tags.Add(type.FullName);

            if (type.GetTypeInfo().GetCustomAttributes<FunctionalTestAttribute>().Any())
            {
                group.Tags.Add("Functional");
            }

            foreach (TagAttribute attr in type.GetTypeInfo().GetCustomAttributes<TagAttribute>())
            {
                group.Tags.Add(attr.Tag);
            }
            return group;
        }

        private static TestMethod CreateMethod(Type type, object instance, MethodInfo method)
        {
            TestMethod test = new TestMethod();
            test.Name = method.Name;

            if (method.GetCustomAttributes<AsyncTestMethodAttribute>().Any())
            {
                test.Test = new AsyncTestMethodAsyncAction(instance, method);
            }
            else
            {
                test.Test = new TestMethodAsyncAction(instance, method);
            }

            ExcludeTestAttribute excluded = method.GetCustomAttribute<ExcludeTestAttribute>();
            if (excluded != null)
            {
                test.Exclude(excluded.Reason);
            }

            if (method.GetCustomAttributes<FunctionalTestAttribute>().Any())
            {
                test.Tags.Add("Functional");
            }

            test.Tags.Add(type.FullName + "." + method.Name);
            test.Tags.Add(type.Name + "." + method.Name);
            foreach (TagAttribute attr in method.GetCustomAttributes<TagAttribute>())
            {
                test.Tags.Add(attr.Tag);
            }

            return test;
        }
    }
}
