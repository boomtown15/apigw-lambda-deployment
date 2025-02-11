exports.handler = async function(event) {
  console.log('Hello World from Lambda!');
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello from Lambda!'
    })
  };
};