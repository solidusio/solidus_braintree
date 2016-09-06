// Wrap a function and return a promise instead of accepting a callback.
//
// @param target [Function] the function to be wrapped. This function *must*
// accept a callback as its last argument of the form `function(err, data) {}`.
// @param args [Array] an array of the arguments for the target function.
// Not including the final callback, which will be provided by promisify.
// @returns [Promise] A jQuery promise object which will resolve or reject
// based on the arguments passed to the callback.
function promisify(fun, args, self) {
  var d = $.Deferred();
  fun.apply(self || this, (args || []).concat(function (err, data) {
    err && d.reject(err);
    d.resolve(data);
  }));
  return d.promise();
};
