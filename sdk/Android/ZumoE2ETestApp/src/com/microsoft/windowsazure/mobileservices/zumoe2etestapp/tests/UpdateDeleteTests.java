/*
Copyright (c) Microsoft Open Technologies, Inc.
All Rights Reserved
Apache 2.0 License
 
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at
 
     http://www.apache.org/licenses/LICENSE-2.0
 
   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
 
See the Apache Version 2.0 License for specific language governing permissions and limitations under the License.
 */
package com.microsoft.windowsazure.mobileservices.zumoe2etestapp.tests;

import java.util.Random;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.microsoft.windowsazure.mobileservices.MobileServiceClient;
import com.microsoft.windowsazure.mobileservices.MobileServiceException;
import com.microsoft.windowsazure.mobileservices.table.MobileServiceJsonTable;
import com.microsoft.windowsazure.mobileservices.table.MobileServiceTable;
import com.microsoft.windowsazure.mobileservices.zumoe2etestapp.framework.ExpectedValueException;
import com.microsoft.windowsazure.mobileservices.zumoe2etestapp.framework.TestCase;
import com.microsoft.windowsazure.mobileservices.zumoe2etestapp.framework.TestExecutionCallback;
import com.microsoft.windowsazure.mobileservices.zumoe2etestapp.framework.TestGroup;
import com.microsoft.windowsazure.mobileservices.zumoe2etestapp.framework.TestResult;
import com.microsoft.windowsazure.mobileservices.zumoe2etestapp.framework.TestStatus;
import com.microsoft.windowsazure.mobileservices.zumoe2etestapp.framework.Util;
import com.microsoft.windowsazure.mobileservices.zumoe2etestapp.tests.types.IntIdRoundTripTableElement;
import com.microsoft.windowsazure.mobileservices.table.TableDeleteCallback;
import com.microsoft.windowsazure.mobileservices.table.TableOperationCallback;
import com.microsoft.windowsazure.mobileservices.table.TableJsonOperationCallback;
import com.microsoft.windowsazure.mobileservices.http.ServiceFilterResponse;

public class UpdateDeleteTests extends TestGroup {

	protected static final String ROUNDTRIP_TABLE_NAME = "IntIdRoundTripTable";

	public UpdateDeleteTests() {
		super("Insert/Update/Delete Tests");

		Random rndGen = new Random();

		// typed update

		this.addTest(createTypedUpdateTest("Update typed item", new IntIdRoundTripTableElement(rndGen), new IntIdRoundTripTableElement(rndGen), true, null));

		this.addTest(createTypedUpdateTest("Update typed item, setting values to null", new IntIdRoundTripTableElement(rndGen), new IntIdRoundTripTableElement(
				false), true, null));

		IntIdRoundTripTableElement elem1 = new IntIdRoundTripTableElement(rndGen);
		IntIdRoundTripTableElement elem2 = new IntIdRoundTripTableElement(rndGen);
		elem2.id = 1000000000L;

		this.addTest(createTypedUpdateTest("(Neg) Update typed item, non-existing item id", elem1, elem2, false, MobileServiceException.class));

		elem1 = new IntIdRoundTripTableElement(rndGen);
		elem2 = new IntIdRoundTripTableElement(rndGen);
		elem2.id = 0L;

		this.addTest(createTypedUpdateTest("(Neg) Update typed item, id = 0", elem1, elem2, false, IllegalArgumentException.class));

		// untyped update
		JsonParser parser = new JsonParser();

		String toInsertJsonString = "{" + "\"name\":\"hello\"," + "\"bool\":true," + "\"integer\":-1234," + "\"number\":123.45,"
				+ "\"date1\":\"2012-12-13T09:23:12.000Z\"" + "}";

		String toUpdateJsonString = "{" + "\"name\":\"world\"," + "\"bool\":false," + "\"integer\":9999," + "\"number\":888.88,"
				+ "\"date1\":\"1999-05-23T19:15:54.000Z\"" + "}";

		this.addTest(createUntypedUpdateTest("Update untyped item", parser.parse(toInsertJsonString).getAsJsonObject(), parser.parse(toUpdateJsonString)
				.getAsJsonObject(), true, null));

		JsonObject toUpdate = parser.parse(toUpdateJsonString).getAsJsonObject();
		toUpdate.add("name", null);
		toUpdate.add("bool", null);
		toUpdate.add("integer", null);

		this.addTest(createUntypedUpdateTest("Update untyped item, setting values to null", parser.parse(toInsertJsonString).getAsJsonObject(),
				cloneJson(toUpdate), true, null));

		toUpdate.addProperty("id", 1000000000);
		this.addTest(createUntypedUpdateTest("(Neg) Update untyped item, non-existing item id", parser.parse(toInsertJsonString).getAsJsonObject(),
				cloneJson(toUpdate), false, MobileServiceException.class));

		toUpdate.addProperty("id", 0);
		this.addTest(createUntypedUpdateTest("(Neg) Update untyped item, id = 0", parser.parse(toInsertJsonString).getAsJsonObject(), cloneJson(toUpdate),
				false, IllegalArgumentException.class));

		// delete tests
		this.addTest(createDeleteTest("Delete typed item", true, false, true, null));
		this.addTest(createDeleteTest("(Neg) Delete typed item with non-existing id", true, true, true, MobileServiceException.class));
		this.addTest(createDeleteTest("Delete untyped item", false, false, true, null));
		this.addTest(createDeleteTest("(Neg) Delete untyped item with non-existing id", false, true, true, MobileServiceException.class));
		this.addTest(createDeleteTest("(Neg) Delete untyped item without id field", false, false, false, IllegalArgumentException.class));

		// With Callbacks
		this.addTest(createTypedUpdateWithCallbackTest("With Callback - Update typed item", new IntIdRoundTripTableElement(rndGen),
				new IntIdRoundTripTableElement(rndGen), true, null));
		this.addTest(createUntypedUpdateWithCallbackTest("With Callback - Update untyped item, setting values to null", parser.parse(toInsertJsonString)
				.getAsJsonObject(), cloneJson(toUpdate), true, null));

		this.addTest(createDeleteWithCallbackTest("With Callback - Delete typed item", true, false, true, null));
		this.addTest(createDeleteWithCallbackTest("With Callback - Delete untyped item", false, false, true, null));

	}

	private JsonObject cloneJson(JsonObject json) {
		return new JsonParser().parse(json.toString()).getAsJsonObject();
	}

	private TestCase createTypedUpdateTest(String name, final IntIdRoundTripTableElement itemToInsert, final IntIdRoundTripTableElement itemToUpdate,
			final boolean setUpdatedId, final Class<?> expectedExceptionClass) {

		final TestCase test = new TestCase() {

			@Override
			protected void executeTest(MobileServiceClient client, final TestExecutionCallback callback) {

				final MobileServiceTable<IntIdRoundTripTableElement> table = client.getTable(ROUNDTRIP_TABLE_NAME, IntIdRoundTripTableElement.class);
				final TestCase testCase = this;

				log("insert item");
				itemToInsert.id = null;

				final TestResult result = new TestResult();
				result.setTestCase(testCase);
				result.setStatus(TestStatus.Passed);

				try {

					IntIdRoundTripTableElement insertedItem = table.insert(itemToInsert).get();

					if (setUpdatedId) {
						log("update item id " + insertedItem.id);
						itemToUpdate.id = insertedItem.id;
					}

					log("update the item");

					IntIdRoundTripTableElement updatedItem = table.update(itemToUpdate).get();

					log("lookup item");

					IntIdRoundTripTableElement lookedUpItem = table.lookUp(updatedItem.id).get();

					log("verify items are equal");
					if (Util.compare(updatedItem, lookedUpItem)) { // check
																	// the
																	// items
																	// are
																	// equal
						log("cleanup");

						table.delete(lookedUpItem.id).get();// clean
															// up

						if (callback != null)
							callback.onTestComplete(testCase, result);

					} else {
						createResultFromException(result, new ExpectedValueException(updatedItem, lookedUpItem));
						if (callback != null)
							callback.onTestComplete(testCase, result);
					}
				} catch (Exception exception) {
					createResultFromException(result, exception);
					if (callback != null)
						callback.onTestComplete(testCase, result);
				}
			}
		};

		test.setExpectedExceptionClass(expectedExceptionClass);
		test.setName(name);

		return test;
	}

	private TestCase createUntypedUpdateTest(String name, final JsonObject itemToInsert, final JsonObject itemToUpdate, final boolean setUpdatedId,
			final Class<?> expectedExceptionClass) {

		final TestCase test = new TestCase() {

			@Override
			protected void executeTest(MobileServiceClient client, final TestExecutionCallback callback) {

				final MobileServiceJsonTable table = client.getTable(ROUNDTRIP_TABLE_NAME);
				final TestCase testCase = this;

				final TestResult result = new TestResult();
				result.setTestCase(testCase);
				result.setStatus(TestStatus.Passed);

				log("insert item");

				try {

					JsonObject insertedItem = table.insert(itemToInsert).get();

					if (setUpdatedId) {
						int id = insertedItem.get("id").getAsInt();
						log("update item id " + id);
						itemToUpdate.addProperty("id", id);
					}

					log("update the item");
					JsonObject updatedItem = table.update(itemToUpdate).get();

					log("lookup the item");
					JsonObject lookedUpItem = (JsonObject) table.lookUp(updatedItem.get("id").getAsInt()).get();

					log("verify items are equal");
					if (Util.compareJson(updatedItem, lookedUpItem)) { // check
																		// the
																		// items
																		// are
																		// equal
						log("cleanup");
						table.delete(lookedUpItem.get("id").getAsInt()).get(); // clean

						if (callback != null)
							callback.onTestComplete(testCase, result);
					} else {
						createResultFromException(result, new ExpectedValueException(updatedItem, lookedUpItem));
						if (callback != null)
							callback.onTestComplete(testCase, result);
					}
				} catch (Exception exception) {
					createResultFromException(result, exception);
					if (callback != null)
						callback.onTestComplete(testCase, result);
				}
			}
		};

		test.setExpectedExceptionClass(expectedExceptionClass);
		test.setName(name);

		return test;
	}

	private TestCase createDeleteTest(String name, final boolean typed, final boolean useFakeId, final boolean includeId, Class<?> expectedExceptionClass) {
		TestCase testCase = new TestCase() {

			@Override
			protected void executeTest(final MobileServiceClient client, final TestExecutionCallback callback) {
				IntIdRoundTripTableElement element = new IntIdRoundTripTableElement(new Random());
				final MobileServiceTable<IntIdRoundTripTableElement> table = client.getTable(ROUNDTRIP_TABLE_NAME, IntIdRoundTripTableElement.class);

				final TestResult result = new TestResult();
				result.setStatus(TestStatus.Passed);

				final TestCase testCase = this;
				result.setTestCase(testCase);

				log("insert item");

				try {

					IntIdRoundTripTableElement entity = table.insert(element).get();

					Object deleteObject;

					if (useFakeId) {
						log("use fake id");
						entity.id = 1000000000L;
					}

					if (!includeId) {
						log("include id");
						entity.id = null;
					}

					if (typed) {
						deleteObject = entity;
					} else {
						deleteObject = client.getGsonBuilder().create().toJsonTree(entity).getAsJsonObject();
					}

					log("delete");

					table.delete(deleteObject).get();

				} catch (Exception exception) {
					if (exception != null) {
						createResultFromException(result, exception);
					}
				} finally {
					if (callback != null)
						callback.onTestComplete(testCase, result);
				}
			}
		};

		testCase.setName(name);
		testCase.setExpectedExceptionClass(expectedExceptionClass);

		return testCase;
	}

	@SuppressWarnings("deprecation")
	private TestCase createTypedUpdateWithCallbackTest(String name, final IntIdRoundTripTableElement itemToInsert,
			final IntIdRoundTripTableElement itemToUpdate, final boolean setUpdatedId, final Class<?> expectedExceptionClass) {

		final TestCase test = new TestCase() {

			@Override
			protected void executeTest(MobileServiceClient client, final TestExecutionCallback callback) {

				final MobileServiceTable<IntIdRoundTripTableElement> table = client.getTable(ROUNDTRIP_TABLE_NAME, IntIdRoundTripTableElement.class);
				final TestCase testCase = this;

				log("insert item");
				itemToInsert.id = null;

				table.insert(itemToInsert, new TableOperationCallback<IntIdRoundTripTableElement>() {

					@Override
					public void onCompleted(final IntIdRoundTripTableElement insertedItem, Exception exception, ServiceFilterResponse response) {
						final TestResult result = new TestResult();
						result.setTestCase(testCase);
						result.setStatus(TestStatus.Passed);

						if (exception == null) { // if it was ok

							if (setUpdatedId) {
								log("update item id " + insertedItem.id);
								itemToUpdate.id = insertedItem.id;
							}

							log("update the item");
							table.update(itemToUpdate, new TableOperationCallback<IntIdRoundTripTableElement>() {

								@Override
								public void onCompleted(final IntIdRoundTripTableElement updatedItem, Exception exception, ServiceFilterResponse response) {

									if (exception == null) { // if it was ok

										log("lookup item");
										table.lookUp(updatedItem.id, new TableOperationCallback<IntIdRoundTripTableElement>() {

											@Override
											public void onCompleted(IntIdRoundTripTableElement lookedUpItem, Exception exception, ServiceFilterResponse response) {
												if (exception == null) { // if
																			// it
																			// was
																			// ok

													log("verify items are equal");
													if (Util.compare(updatedItem, lookedUpItem)) { // check
																									// the
																									// items
																									// are
																									// equal
														log("cleanup");
														table.delete(lookedUpItem.id, new TableDeleteCallback() { // clean
																													// up

																	@Override
																	public void onCompleted(Exception exception, ServiceFilterResponse response) {
																		if (exception != null) {
																			createResultFromException(result, exception);
																		}

																		// callback
																		// with
																		// success
																		// or
																		// error
																		// on
																		// cleanup
																		if (callback != null)
																			callback.onTestComplete(testCase, result);
																	}
																});
													} else {
														createResultFromException(result, new ExpectedValueException(insertedItem, lookedUpItem));
														if (callback != null)
															callback.onTestComplete(testCase, result);
													}
												} else {
													createResultFromException(result, exception);
													if (callback != null)
														callback.onTestComplete(testCase, result);
												}
											}

										});
									} else {
										createResultFromException(result, exception);
										if (callback != null)
											callback.onTestComplete(testCase, result);
									}
								}

							});
						} else {
							createResultFromException(result, exception);
							if (callback != null)
								callback.onTestComplete(testCase, result);
						}
					}

				});

			}
		};

		test.setExpectedExceptionClass(expectedExceptionClass);
		test.setName(name);

		return test;
	}

	@SuppressWarnings("deprecation")
	private TestCase createUntypedUpdateWithCallbackTest(String name, final JsonObject itemToInsert, final JsonObject itemToUpdate, final boolean setUpdatedId,
			final Class<?> expectedExceptionClass) {

		final TestCase test = new TestCase() {

			@Override
			protected void executeTest(MobileServiceClient client, final TestExecutionCallback callback) {

				final MobileServiceJsonTable table = client.getTable(ROUNDTRIP_TABLE_NAME);
				final TestCase testCase = this;

				log("insert item");
				table.insert(itemToInsert, new TableJsonOperationCallback() {

					@Override
					public void onCompleted(final JsonObject insertedItem, Exception exception, ServiceFilterResponse response) {
						final TestResult result = new TestResult();
						result.setTestCase(testCase);
						result.setStatus(TestStatus.Passed);

						if (exception == null) { // if it was ok

							if (setUpdatedId) {
								int id = insertedItem.get("id").getAsInt();
								log("update item id " + id);
								itemToUpdate.addProperty("id", id);
							}

							log("update the item");
							table.update(itemToUpdate, new TableJsonOperationCallback() {

								@Override
								public void onCompleted(final JsonObject updatedItem, Exception exception, ServiceFilterResponse response) {

									if (exception == null) { // if it was ok

										log("lookup the item");
										table.lookUp(updatedItem.get("id").getAsInt(), new TableJsonOperationCallback() {

											@Override
											public void onCompleted(JsonObject lookedUpItem, Exception exception, ServiceFilterResponse response) {
												if (exception == null) { // if
																			// it
																			// was
																			// ok
													log("verify items are equal");
													if (Util.compareJson(updatedItem, lookedUpItem)) { // check
																										// the
																										// items
																										// are
																										// equal
														log("cleanup");
														table.delete(lookedUpItem.get("id").getAsInt(), new TableDeleteCallback() { // clean
																																	// up

																	@Override
																	public void onCompleted(Exception exception, ServiceFilterResponse response) {
																		if (exception != null) {
																			createResultFromException(result, exception);
																		}

																		// callback
																		// with
																		// success
																		// or
																		// error
																		// on
																		// cleanup
																		if (callback != null)
																			callback.onTestComplete(testCase, result);
																	}
																});
													} else {
														createResultFromException(result, new ExpectedValueException(insertedItem, lookedUpItem));
														if (callback != null)
															callback.onTestComplete(testCase, result);
													}
												} else {
													createResultFromException(result, exception);
													if (callback != null)
														callback.onTestComplete(testCase, result);
												}
											}

										});
									} else {
										createResultFromException(result, exception);
										if (callback != null)
											callback.onTestComplete(testCase, result);
									}
								}

							});
						} else {
							createResultFromException(result, exception);
							if (callback != null)
								callback.onTestComplete(testCase, result);
						}
					}

				});

			}
		};

		test.setExpectedExceptionClass(expectedExceptionClass);
		test.setName(name);

		return test;
	}

	@SuppressWarnings("deprecation")
	private TestCase createDeleteWithCallbackTest(String name, final boolean typed, final boolean useFakeId, final boolean includeId,
			Class<?> expectedExceptionClass) {
		TestCase testCase = new TestCase() {

			@Override
			protected void executeTest(final MobileServiceClient client, final TestExecutionCallback callback) {
				IntIdRoundTripTableElement element = new IntIdRoundTripTableElement(new Random());
				final MobileServiceTable<IntIdRoundTripTableElement> table = client.getTable(ROUNDTRIP_TABLE_NAME, IntIdRoundTripTableElement.class);

				final TestCase testCase = this;
				log("insert item");
				table.insert(element, new TableOperationCallback<IntIdRoundTripTableElement>() {

					@Override
					public void onCompleted(IntIdRoundTripTableElement entity, Exception exception, ServiceFilterResponse response) {
						final TestResult result = new TestResult();
						result.setStatus(TestStatus.Passed);
						result.setTestCase(testCase);

						if (exception == null) {
							Object deleteObject;

							if (useFakeId) {
								log("use fake id");
								entity.id = 1000000000L;
							}

							if (!includeId) {
								log("include id");
								entity.id = null;
							}

							if (typed) {
								deleteObject = entity;
							} else {
								deleteObject = client.getGsonBuilder().create().toJsonTree(entity).getAsJsonObject();
							}

							log("delete");
							table.delete(deleteObject, new TableDeleteCallback() {

								@Override
								public void onCompleted(Exception exception, ServiceFilterResponse response) {
									if (exception != null) {
										createResultFromException(result, exception);
									}

									if (callback != null)
										callback.onTestComplete(testCase, result);
								}
							});

						} else {
							createResultFromException(result, exception);
							if (callback != null)
								callback.onTestComplete(testCase, result);
						}
					}

				});
			}
		};

		testCase.setName(name);
		testCase.setExpectedExceptionClass(expectedExceptionClass);

		return testCase;
	}
}
