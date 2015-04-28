function update(item, user, request) {
  request.execute({
    success: function() {
      request.respond();
    }, conflict: function(serverItem) {
      var policy = request.parameters.conflictPolicy || "";
      policy = policy.toLowerCase();
      if (policy === 'client' || policy === 'clientwins') {
        // item.__version has been updated with server version
        request.execute();
      } else if (policy === 'server' || policy === 'serverwins') {
        request.respond(statusCodes.OK, serverItem);
      } else {
        request.respond(statusCodes.PRECONDITION_FAILED, serverItem);
      }
    }
  });
}
