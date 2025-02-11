// import getBody from index.js
const { getBody } = require('../../../lambda/index.js');

describe('getBody', () => {
    test('should return object with correct status code', () => {
        const response = getBody();
        expect(response.statusCode).toBe(200);
    });

    test('should return object with correct body structure', () => {
        const response = getBody();
        const parsedBody = JSON.parse(response.body);
        expect(parsedBody).toHaveProperty('message');
    });

    test('should return valid JSON in body', () => {
        const response = getBody();
        expect(() => {
            JSON.parse(response.body);
        }).not.toThrow();
    });
});
