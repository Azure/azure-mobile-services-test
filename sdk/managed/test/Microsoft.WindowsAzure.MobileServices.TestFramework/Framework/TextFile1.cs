 [JsonIgnore]
        private List<TestResultMetaData> tests;

        [JsonIgnore]
        public IEnumerable<TestResultMetaData> Tests { get { return this.tests; } }

       

        public void AddTestResult(TestResult result)
        {
            this.tests.Add(result);
            this.TestCount++;
        }

        //For Reference to be removed nasoni
        // Create a Test Run
        public static TestRun LoadRun(string fileName, string logContents, string runtimeVersion, string clientVersion)
        {            

            TestRun result = new TestRun();


            result.EndTime = DateTime.UtcNow; // Test Run Endtime                        
            result.Tags.Add("platform"); // Test Run Platform
            result.Name = "E2E Test App - nasoni Demo 7/29 ";// + platform; // Test Run Name 

            const string EndOfTestMarker = "-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*";  // log lines
            const string StartOfTestMarker = "Logs for test "; // test Run  starter line
            const string StartOfGroupMarker = "Start of group: "; // test Run asthetics
            result.StartTime = DateTime.UtcNow; ; // test Run start time
			result.VersionSpec.BranchName = runtimeVersion; // run time version
			result.count = count // run test count


            Regex testLogRegex = new Regex(@"\[" +
                @"(?<year>\d{4})\-(?<month>\d{2})\-(?<day>\d{2}) " +
                @"(?<hour>\d{2})\:(?<minute>\d{2})\:(?<second>\d{2})\.(?<millis>\d{3})\] " +
                @"(?<logText>.+)");
            bool firstLine = true;
            TestResult test = new TestResult();
            string groupName = "";
            List<string> dummyTestPrefixes = new List<string>
            {
                StartOfGroupMarker,
                "-------------"
            };

            List<string> testLogLines = new List<string>();

            string[] lines = logContents.Split('\r', '\n');
            foreach (var line in lines)
            {
                testLogLines.Add(line);
                match = testLogRegex.Match(line);
                if (match.Success)
                {
                    DateTime timestamp = new DateTime(
                        int.Parse(match.Groups["year"].Value),
                        int.Parse(match.Groups["month"].Value),
                        int.Parse(match.Groups["day"].Value),
                        int.Parse(match.Groups["hour"].Value),
                        int.Parse(match.Groups["minute"].Value),
                        int.Parse(match.Groups["second"].Value),
                        int.Parse(match.Groups["millis"].Value),
                        DateTimeKind.Utc);
                    if (firstLine)
                    {
                        
                        firstLine = false;
                    }

                    string logText = match.Groups["logText"].Value;
                    if (logText.StartsWith(EndOfTestMarker))
                    {
                        if (test.StartTime != DateTime.MinValue)
                        {
                            test.EndTime = timestamp;
                            test.Logs = new TestLogs();
                            test.Logs.LogLines = string.Join("\n", testLogLines);
                            testLogLines.Clear();
                           
                            test = new TestResult();
                        }
                    }
                    else if (logText.StartsWith(StartOfTestMarker))
                    {
                        testLogLines.Clear();
                        testLogLines.Add(line);
                        string testNameAndResult = logText.Substring(StartOfTestMarker.Length);
                        int parenIndex = testNameAndResult.LastIndexOf('(');
                        string testName = testNameAndResult.Substring(0, parenIndex - 1);
                        if (dummyTestPrefixes.Any(p => testName.StartsWith(p)))
                        {
                            if (testName.StartsWith(StartOfGroupMarker))
                            {
                                groupName = testName.Substring(StartOfGroupMarker.Length);
                            }

                            // One of the "filler" tests
                            continue;
                        }

                        string testResult = testNameAndResult.Substring(parenIndex + 1);
                        testResult = testResult.Substring(0, testResult.Length - 1); // removing ')'
                        test.Outcome = testResult;
                        test.StartTime = timestamp;
                        test.Source = platform + "-" + groupName.Replace(" ", "");
                        test.FullName = testName;
                        string clientPlatform = platform;
                        if (!string.IsNullOrEmpty(clientVersion))
                        {
                            clientPlatform = clientPlatform + " - " + clientVersion;
                        }

                        test.Tags.Add(clientPlatform);
                    }
                }
            }

           
            return result;
        }