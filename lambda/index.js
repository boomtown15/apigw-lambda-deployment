function getBody() {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Version 1'
    })
  };
}

exports.handler = async function(event) {
  console.log(event);
  return getBody();
};

// Add this line to export getBody
exports.getBody = getBody;
