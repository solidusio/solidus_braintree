SolidusBraintree.ajax = function(url, options) {
  if (typeof url === "object") {
    options = url;
    url = undefined;
  }
  options = options || {};
  options = $.extend(options, {
    headers: {
      'Authorization': 'Bearer '
    }
  });
  return $.ajax(url, options);
};
