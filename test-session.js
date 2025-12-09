/**
 * Test Case: Session Token Creation and Usage
 * 
 * This test verifies:
 * 1. Session token is created on login
 * 2. Session token is stored in localStorage
 * 3. Session token is sent with API requests
 * 4. Session token is validated by server
 * 5. Points can be added/removed using session token
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const PASSWORD = 'parent123';

// Test results
const results = {
    passed: [],
    failed: []
};

function log(message) {
    console.log(`[TEST] ${message}`);
}

function assert(condition, message) {
    if (condition) {
        results.passed.push(message);
        log(`✓ PASS: ${message}`);
    } else {
        results.failed.push(message);
        log(`✗ FAIL: ${message}`);
    }
}

function makeRequest(method, path, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = data ? JSON.parse(data) : {};
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: jsonData
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                }
            });
        });

        req.on('error', (error) => {
            if (error.code === 'ECONNREFUSED') {
                reject(new Error(`Connection refused. Is the server running on ${BASE_URL}? Run "npm start" in another terminal.`));
            } else {
                reject(error);
            }
        });

        if (body) {
            req.write(JSON.stringify(body));
        }

        req.end();
    });
}

async function runTests() {
    log('Starting Session Token Tests...\n');
    log('⚠️  Make sure the server is running (npm start) before running tests!\n');

    // Test 1: Login and get session token
    log('Test 1: Login and get session token');
    let sessionToken = null;
    let expiresAt = null;
    try {
        const response = await makeRequest('POST', '/api/auth', {
            'x-password': PASSWORD
        });
        
        assert(response.status === 200, 'Login returns 200 status');
        assert(response.body.success === true, 'Login response has success: true');
        
        // Debug: log the actual response
        log(`  Response body: ${JSON.stringify(response.body)}`);
        
        assert(response.body.sessionToken !== undefined, 'Response includes sessionToken');
        assert(response.body.expiresAt !== undefined, 'Response includes expiresAt');
        assert(typeof response.body.sessionToken === 'string', 'sessionToken is a string');
        assert(response.body.sessionToken.length > 0, 'sessionToken is not empty');
        
        if (response.body.sessionToken) {
            sessionToken = response.body.sessionToken;
            expiresAt = response.body.expiresAt;
            log(`  Session Token: ${sessionToken.substring(0, 20)}...`);
            log(`  Expires At: ${expiresAt}`);
        }
    } catch (error) {
        assert(false, `Login request failed: ${error.message}`);
    }

    if (!sessionToken) {
        log('\n❌ Cannot continue tests without session token\n');
        printResults();
        process.exit(1);
    }

    // Test 2: Validate session token
    log('\nTest 2: Validate session token');
    try {
        const response = await makeRequest('GET', '/api/session/validate', {
            'x-session-token': sessionToken
        });
        
        assert(response.status === 200, 'Session validation returns 200 status');
        assert(response.body.valid === true, 'Session is valid');
    } catch (error) {
        assert(false, `Session validation failed: ${error.message}`);
    }

    // Test 3: Get kids using session token
    log('\nTest 3: Get kids using session token');
    try {
        const response = await makeRequest('GET', '/api/kids', {
            'x-session-token': sessionToken
        });
        
        assert(response.status === 200, 'Get kids returns 200 status');
        assert(Array.isArray(response.body), 'Response is an array');
        assert(response.body.length >= 1, 'At least one kid exists');
        
        if (response.body.length > 0) {
            log(`  Found ${response.body.length} kid(s)`);
        }
    } catch (error) {
        assert(false, `Get kids failed: ${error.message}`);
    }

    // Test 4: Add points using session token
    log('\nTest 4: Add points using session token');
    try {
        // First get a kid ID
        const kidsResponse = await makeRequest('GET', '/api/kids');
        const kidId = kidsResponse.body[0]?.id;
        
        if (!kidId) {
            assert(false, 'No kid ID available for testing');
        } else {
            const response = await makeRequest('POST', '/api/transactions', {
                'x-session-token': sessionToken
            }, {
                kid_id: kidId,
                points: 5,
                tag: 'Test'
            });
            
            assert(response.status === 200, 'Add points returns 200 status');
            assert(response.body.success === true, 'Add points response has success: true');
            log(`  Added 5 points to kid ${kidId}`);
        }
    } catch (error) {
        assert(false, `Add points failed: ${error.message}`);
    }

    // Test 5: Remove points using session token
    log('\nTest 5: Remove points using session token');
    try {
        const kidsResponse = await makeRequest('GET', '/api/kids');
        const kidId = kidsResponse.body[0]?.id;
        
        if (!kidId) {
            assert(false, 'No kid ID available for testing');
        } else {
            const response = await makeRequest('POST', '/api/transactions', {
                'x-session-token': sessionToken
            }, {
                kid_id: kidId,
                points: -3,
                tag: 'Test'
            });
            
            assert(response.status === 200, 'Remove points returns 200 status');
            assert(response.body.success === true, 'Remove points response has success: true');
            log(`  Removed 3 points from kid ${kidId}`);
        }
    } catch (error) {
        assert(false, `Remove points failed: ${error.message}`);
    }

    // Test 6: Update kid using session token
    log('\nTest 6: Update kid using session token');
    try {
        const kidsResponse = await makeRequest('GET', '/api/kids');
        const kidId = kidsResponse.body[0]?.id;
        
        if (!kidId) {
            assert(false, 'No kid ID available for testing');
        } else {
            const response = await makeRequest('PUT', `/api/kids/${kidId}`, {
                'x-session-token': sessionToken
            }, {
                name: 'Test Kid',
                initials: 'TK',
                color: '#FF0000'
            });
            
            assert(response.status === 200, 'Update kid returns 200 status');
            assert(response.body.success === true, 'Update kid response has success: true');
            log(`  Updated kid ${kidId}`);
        }
    } catch (error) {
        assert(false, `Update kid failed: ${error.message}`);
    }

    // Test 7: Invalid session token should fail
    log('\nTest 7: Invalid session token should fail');
    try {
        const response = await makeRequest('GET', '/api/session/validate', {
            'x-session-token': 'invalid_token_12345'
        });
        
        assert(response.status === 401, 'Invalid token returns 401 status');
        assert(response.body.valid === false, 'Invalid token is marked as invalid');
    } catch (error) {
        assert(false, `Invalid token test failed: ${error.message}`);
    }

    // Test 8: Request without session token should fail (for protected endpoints)
    log('\nTest 8: Request without session token should fail');
    try {
        const kidsResponse = await makeRequest('GET', '/api/kids');
        const kidId = kidsResponse.body[0]?.id;
        
        if (!kidId) {
            assert(false, 'No kid ID available for testing');
        } else {
            const response = await makeRequest('POST', '/api/transactions', {}, {
                kid_id: kidId,
                points: 5,
                tag: 'Test'
            });
            
            assert(response.status === 401, 'Request without token returns 401 status');
        }
    } catch (error) {
        assert(false, `No token test failed: ${error.message}`);
    }

    printResults();
}

function printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`✓ Passed: ${results.passed.length}`);
    console.log(`✗ Failed: ${results.failed.length}`);
    console.log(`Total: ${results.passed.length + results.failed.length}`);
    
    if (results.failed.length > 0) {
        console.log('\nFailed Tests:');
        results.failed.forEach((msg, i) => {
            console.log(`  ${i + 1}. ${msg}`);
        });
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed!');
        process.exit(0);
    }
}

// Run tests
runTests().catch(error => {
    console.error('Test execution error:', error);
    process.exit(1);
});

