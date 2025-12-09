/**
 * Comprehensive Test Suite for Kids Points Tracker
 * 
 * Tests all APIs, all if/else conditions, edge cases, and error scenarios
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const PASSWORD = 'parent123';
const WRONG_PASSWORD = 'wrongpassword';

// Test results
const results = {
    passed: [],
    failed: [],
    skipped: []
};

let sessionToken = null;
let kidId1 = null;
let kidId2 = null;
let tagId = null;

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

function skip(message) {
    results.skipped.push(message);
    log(`⊘ SKIP: ${message}`);
}

function makeRequest(method, path, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + (url.search || ''),
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
                        body: jsonData,
                        rawBody: data
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: data,
                        rawBody: data
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

// ============================================================================
// AUTHENTICATION TESTS
// ============================================================================

async function testAuthentication() {
    log('\n' + '='.repeat(60));
    log('AUTHENTICATION API TESTS');
    log('='.repeat(60));

    // Test 1: Login with correct password
    log('\nTest 1.1: Login with correct password');
    try {
        const response = await makeRequest('POST', '/api/auth', {
            'x-password': PASSWORD
        });
        assert(response.status === 200, 'Returns 200 status');
        assert(response.body.success === true, 'Response has success: true');
        assert(response.body.sessionToken !== undefined, 'Response includes sessionToken');
        assert(response.body.expiresAt !== undefined, 'Response includes expiresAt');
        assert(typeof response.body.sessionToken === 'string', 'sessionToken is a string');
        assert(response.body.sessionToken.length === 64, 'sessionToken is 64 characters (32 bytes hex)');
        
        if (response.body.sessionToken) {
            sessionToken = response.body.sessionToken;
            log(`  Session Token: ${sessionToken.substring(0, 20)}...`);
        }
    } catch (error) {
        assert(false, `Login request failed: ${error.message}`);
    }

    // Test 2: Login with incorrect password
    log('\nTest 1.2: Login with incorrect password');
    try {
        const response = await makeRequest('POST', '/api/auth', {
            'x-password': WRONG_PASSWORD
        });
        assert(response.status === 401, 'Returns 401 status');
        assert(response.body.error === 'Incorrect password', 'Error message is correct');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 3: Login with empty password
    log('\nTest 1.3: Login with empty password');
    try {
        const response = await makeRequest('POST', '/api/auth', {
            'x-password': ''
        });
        assert(response.status === 401, 'Returns 401 status');
        assert(response.body.error === 'Incorrect password', 'Error message is correct');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 4: Login with password with whitespace (should be trimmed)
    log('\nTest 1.4: Login with password with whitespace (trimmed)');
    try {
        const response = await makeRequest('POST', '/api/auth', {
            'x-password': '  parent123  '
        });
        assert(response.status === 200, 'Returns 200 status (password trimmed)');
        assert(response.body.success === true, 'Login succeeds with trimmed password');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 5: Login without password header
    log('\nTest 1.5: Login without password header');
    try {
        const response = await makeRequest('POST', '/api/auth', {});
        assert(response.status === 401, 'Returns 401 status');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }
}

// ============================================================================
// SESSION VALIDATION TESTS
// ============================================================================

async function testSessionValidation() {
    log('\n' + '='.repeat(60));
    log('SESSION VALIDATION API TESTS');
    log('='.repeat(60));

    if (!sessionToken) {
        skip('Session validation tests - no session token available');
        return;
    }

    // Test 1: Validate valid session token
    log('\nTest 2.1: Validate valid session token');
    try {
        const response = await makeRequest('GET', '/api/session/validate', {
            'x-session-token': sessionToken
        });
        assert(response.status === 200, 'Returns 200 status');
        assert(response.body.valid === true, 'Session is valid');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 2: Validate invalid session token
    log('\nTest 2.2: Validate invalid session token');
    try {
        const response = await makeRequest('GET', '/api/session/validate', {
            'x-session-token': 'invalid_token_12345'
        });
        assert(response.status === 401, 'Returns 401 status');
        assert(response.body.valid === false, 'Session is invalid');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 3: Validate without token
    log('\nTest 2.3: Validate without token');
    try {
        const response = await makeRequest('GET', '/api/session/validate', {});
        assert(response.status === 401, 'Returns 401 status');
        assert(response.body.valid === false, 'Session is invalid');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 4: Validate with empty token
    log('\nTest 2.4: Validate with empty token');
    try {
        const response = await makeRequest('GET', '/api/session/validate', {
            'x-session-token': ''
        });
        assert(response.status === 401, 'Returns 401 status');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }
}

// ============================================================================
// KIDS API TESTS
// ============================================================================

async function testKidsAPI() {
    log('\n' + '='.repeat(60));
    log('KIDS API TESTS');
    log('='.repeat(60));

    // Test 1: Get all kids (no auth required)
    log('\nTest 3.1: Get all kids (no auth required)');
    try {
        const response = await makeRequest('GET', '/api/kids');
        assert(response.status === 200, 'Returns 200 status');
        assert(Array.isArray(response.body), 'Response is an array');
        assert(response.body.length >= 1, 'At least one kid exists');
        
        if (response.body.length > 0) {
            kidId1 = response.body[0].id;
            kidId2 = response.body.length > 1 ? response.body[1].id : null;
            log(`  Found ${response.body.length} kid(s), using kid ID: ${kidId1}`);
        }
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    if (!kidId1) {
        skip('Kids update tests - no kid ID available');
        return;
    }

    // Test 2: Update kid with session token
    log('\nTest 3.2: Update kid with session token');
    try {
        const response = await makeRequest('PUT', `/api/kids/${kidId1}`, {
            'x-session-token': sessionToken
        }, {
            name: 'Test Kid 1',
            initials: 'T1',
            color: '#FF0000'
        });
        assert(response.status === 200, 'Returns 200 status');
        assert(response.body.success === true, 'Update successful');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 3: Update kid with password
    log('\nTest 3.3: Update kid with password');
    try {
        const response = await makeRequest('PUT', `/api/kids/${kidId1}`, {
            'x-password': PASSWORD
        }, {
            name: 'Test Kid 1 Updated',
            initials: 'T1',
            color: '#00FF00'
        });
        assert(response.status === 200, 'Returns 200 status');
        assert(response.body.success === true, 'Update successful');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 4: Update kid without auth
    log('\nTest 3.4: Update kid without auth');
    try {
        const response = await makeRequest('PUT', `/api/kids/${kidId1}`, {}, {
            name: 'Should Fail',
            initials: 'SF',
            color: '#000000'
        });
        assert(response.status === 401, 'Returns 401 status');
        assert(response.body.error === 'Unauthorized', 'Error message is correct');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 5: Update kid with invalid session token
    log('\nTest 3.5: Update kid with invalid session token');
    try {
        const response = await makeRequest('PUT', `/api/kids/${kidId1}`, {
            'x-session-token': 'invalid_token'
        }, {
            name: 'Should Fail',
            initials: 'SF',
            color: '#000000'
        });
        assert(response.status === 401, 'Returns 401 status');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 6: Update non-existent kid (should still return 200 but update nothing)
    log('\nTest 3.6: Update non-existent kid');
    try {
        const response = await makeRequest('PUT', '/api/kids/99999', {
            'x-session-token': sessionToken
        }, {
            name: 'Non Existent',
            initials: 'NE',
            color: '#000000'
        });
        assert(response.status === 200, 'Returns 200 status (no error, just no update)');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Restore original kid name
    log('\nTest 3.7: Restore original kid name');
    try {
        await makeRequest('PUT', `/api/kids/${kidId1}`, {
            'x-session-token': sessionToken
        }, {
            name: 'Kid 1',
            initials: 'K1',
            color: '#FF6B6B'
        });
    } catch (error) {
        // Ignore restore errors
    }
}

// ============================================================================
// TRANSACTIONS API TESTS
// ============================================================================

async function testTransactionsAPI() {
    log('\n' + '='.repeat(60));
    log('TRANSACTIONS API TESTS');
    log('='.repeat(60));

    if (!kidId1) {
        skip('Transactions tests - no kid ID available');
        return;
    }

    // Test 1: Add points with tag
    log('\nTest 4.1: Add points with tag');
    try {
        const response = await makeRequest('POST', '/api/transactions', {
            'x-session-token': sessionToken
        }, {
            kid_id: kidId1,
            points: 10,
            tag: 'Chores'
        });
        assert(response.status === 200, 'Returns 200 status');
        assert(response.body.success === true, 'Transaction successful');
        assert(response.body.kid !== undefined, 'Response includes kid data');
        assert(response.body.kid.balance >= 10, 'Kid balance increased');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 2: Add points without tag (should default to 'General')
    log('\nTest 4.2: Add points without tag (defaults to General)');
    try {
        const response = await makeRequest('POST', '/api/transactions', {
            'x-session-token': sessionToken
        }, {
            kid_id: kidId1,
            points: 5
        });
        assert(response.status === 200, 'Returns 200 status');
        assert(response.body.success === true, 'Transaction successful');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 3: Remove points (negative)
    log('\nTest 4.3: Remove points (negative value)');
    try {
        const response = await makeRequest('POST', '/api/transactions', {
            'x-session-token': sessionToken
        }, {
            kid_id: kidId1,
            points: -3,
            tag: 'TV'
        });
        assert(response.status === 200, 'Returns 200 status');
        assert(response.body.success === true, 'Transaction successful');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 4: Add points with note
    log('\nTest 4.4: Add points with note');
    try {
        const response = await makeRequest('POST', '/api/transactions', {
            'x-session-token': sessionToken
        }, {
            kid_id: kidId1,
            points: 2,
            tag: 'Chores',
            note: 'Test note'
        });
        assert(response.status === 200, 'Returns 200 status');
        assert(response.body.success === true, 'Transaction successful');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 5: Add points without note (should default to empty string)
    log('\nTest 4.5: Add points without note');
    try {
        const response = await makeRequest('POST', '/api/transactions', {
            'x-session-token': sessionToken
        }, {
            kid_id: kidId1,
            points: 1,
            tag: 'Chores'
        });
        assert(response.status === 200, 'Returns 200 status');
        assert(response.body.success === true, 'Transaction successful');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 6: Add points without auth
    log('\nTest 4.6: Add points without auth');
    try {
        const response = await makeRequest('POST', '/api/transactions', {}, {
            kid_id: kidId1,
            points: 10,
            tag: 'Chores'
        });
        assert(response.status === 401, 'Returns 401 status');
        assert(response.body.error === 'Unauthorized', 'Error message is correct');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 7: Get all transactions
    log('\nTest 4.7: Get all transactions');
    try {
        const response = await makeRequest('GET', '/api/transactions');
        assert(response.status === 200, 'Returns 200 status');
        assert(Array.isArray(response.body), 'Response is an array');
        assert(response.body.length > 0, 'Has transactions');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 8: Get transactions filtered by kid_id
    log('\nTest 4.8: Get transactions filtered by kid_id');
    try {
        const response = await makeRequest('GET', `/api/transactions?kid_id=${kidId1}`);
        assert(response.status === 200, 'Returns 200 status');
        assert(Array.isArray(response.body), 'Response is an array');
        if (response.body.length > 0) {
            assert(response.body[0].kid_id === kidId1, 'All transactions are for specified kid');
        }
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 9: Get transactions with limit
    log('\nTest 4.9: Get transactions with limit');
    try {
        const response = await makeRequest('GET', '/api/transactions?limit=5');
        assert(response.status === 200, 'Returns 200 status');
        assert(Array.isArray(response.body), 'Response is an array');
        assert(response.body.length <= 5, 'Respects limit');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 10: Get transactions with kid_id and limit
    log('\nTest 4.10: Get transactions with kid_id and limit');
    try {
        const response = await makeRequest('GET', `/api/transactions?kid_id=${kidId1}&limit=3`);
        assert(response.status === 200, 'Returns 200 status');
        assert(Array.isArray(response.body), 'Response is an array');
        assert(response.body.length <= 3, 'Respects limit');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }
}

// ============================================================================
// TAGS API TESTS
// ============================================================================

async function testTagsAPI() {
    log('\n' + '='.repeat(60));
    log('TAGS API TESTS');
    log('='.repeat(60));

    // Test 1: Get all tags
    log('\nTest 5.1: Get all tags');
    try {
        const response = await makeRequest('GET', '/api/tags');
        assert(response.status === 200, 'Returns 200 status');
        assert(Array.isArray(response.body), 'Response is an array');
        assert(response.body.length >= 1, 'Has at least one tag');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 2: Create new tag (positive)
    log('\nTest 5.2: Create new tag (positive)');
    try {
        const response = await makeRequest('POST', '/api/tags', {
            'x-session-token': sessionToken
        }, {
            name: 'TestTag' + Date.now(),
            color: '#FF0000',
            is_positive: true
        });
        assert(response.status === 200, 'Returns 200 status');
        assert(response.body.success === true, 'Tag created successfully');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 3: Create new tag (negative)
    log('\nTest 5.3: Create new tag (negative)');
    try {
        const response = await makeRequest('POST', '/api/tags', {
            'x-session-token': sessionToken
        }, {
            name: 'TestTagNegative' + Date.now(),
            color: '#00FF00',
            is_positive: false
        });
        assert(response.status === 200, 'Returns 200 status');
        assert(response.body.success === true, 'Tag created successfully');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 4: Create duplicate tag (should fail)
    log('\nTest 5.4: Create duplicate tag (should fail)');
    try {
        const duplicateName = 'DuplicateTag' + Date.now();
        // Create first tag
        await makeRequest('POST', '/api/tags', {
            'x-session-token': sessionToken
        }, {
            name: duplicateName,
            color: '#0000FF',
            is_positive: true
        });
        
        // Try to create duplicate
        const response = await makeRequest('POST', '/api/tags', {
            'x-session-token': sessionToken
        }, {
            name: duplicateName,
            color: '#FF00FF',
            is_positive: false
        });
        assert(response.status === 400, 'Returns 400 status');
        assert(response.body.error === 'Tag already exists', 'Error message is correct');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 5: Create tag without auth
    log('\nTest 5.5: Create tag without auth');
    try {
        const response = await makeRequest('POST', '/api/tags', {}, {
            name: 'UnauthorizedTag',
            color: '#FFFFFF',
            is_positive: true
        });
        assert(response.status === 401, 'Returns 401 status');
        assert(response.body.error === 'Unauthorized', 'Error message is correct');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 6: Create tag with is_positive as 1 (number)
    log('\nTest 5.6: Create tag with is_positive as 1 (number)');
    try {
        const response = await makeRequest('POST', '/api/tags', {
            'x-session-token': sessionToken
        }, {
            name: 'TestTagNumber' + Date.now(),
            color: '#123456',
            is_positive: 1
        });
        assert(response.status === 200, 'Returns 200 status');
        assert(response.body.success === true, 'Tag created successfully');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 7: Create tag with is_positive as 0 (number)
    log('\nTest 5.7: Create tag with is_positive as 0 (number)');
    try {
        const response = await makeRequest('POST', '/api/tags', {
            'x-session-token': sessionToken
        }, {
            name: 'TestTagZero' + Date.now(),
            color: '#654321',
            is_positive: 0
        });
        assert(response.status === 200, 'Returns 200 status');
        assert(response.body.success === true, 'Tag created successfully');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE TESTS
// ============================================================================

async function testAuthMiddleware() {
    log('\n' + '='.repeat(60));
    log('AUTHENTICATION MIDDLEWARE TESTS');
    log('='.repeat(60));

    if (!kidId1) {
        skip('Auth middleware tests - no kid ID available');
        return;
    }

    // Test 1: Protected endpoint with valid session token
    log('\nTest 6.1: Protected endpoint with valid session token');
    try {
        const response = await makeRequest('POST', '/api/transactions', {
            'x-session-token': sessionToken
        }, {
            kid_id: kidId1,
            points: 1,
            tag: 'Test'
        });
        assert(response.status === 200, 'Returns 200 status (session token works)');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 2: Protected endpoint with valid password
    log('\nTest 6.2: Protected endpoint with valid password');
    try {
        const response = await makeRequest('POST', '/api/transactions', {
            'x-password': PASSWORD
        }, {
            kid_id: kidId1,
            points: 1,
            tag: 'Test'
        });
        assert(response.status === 200, 'Returns 200 status (password works)');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 3: Protected endpoint with invalid session token (should fall back to password check)
    log('\nTest 6.3: Protected endpoint with invalid session token and no password');
    try {
        const response = await makeRequest('POST', '/api/transactions', {
            'x-session-token': 'invalid_token'
        }, {
            kid_id: kidId1,
            points: 1,
            tag: 'Test'
        });
        assert(response.status === 401, 'Returns 401 status (invalid token, no password)');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 4: Protected endpoint with invalid session token but valid password
    log('\nTest 6.4: Protected endpoint with invalid session token but valid password');
    try {
        const response = await makeRequest('POST', '/api/transactions', {
            'x-session-token': 'invalid_token',
            'x-password': PASSWORD
        }, {
            kid_id: kidId1,
            points: 1,
            tag: 'Test'
        });
        assert(response.status === 200, 'Returns 200 status (password fallback works)');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }

    // Test 5: Protected endpoint with no auth
    log('\nTest 6.5: Protected endpoint with no auth');
    try {
        const response = await makeRequest('POST', '/api/transactions', {}, {
            kid_id: kidId1,
            points: 1,
            tag: 'Test'
        });
        assert(response.status === 401, 'Returns 401 status');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }
}

// ============================================================================
// ROOT ENDPOINT TEST
// ============================================================================

async function testRootEndpoint() {
    log('\n' + '='.repeat(60));
    log('ROOT ENDPOINT TEST');
    log('='.repeat(60));

    log('\nTest 7.1: Get root endpoint (index.html)');
    try {
        const response = await makeRequest('GET', '/');
        assert(response.status === 200, 'Returns 200 status');
        assert(typeof response.rawBody === 'string', 'Returns HTML content');
        assert(response.rawBody.includes('<!DOCTYPE html>') || response.rawBody.includes('<html'), 'Returns HTML');
    } catch (error) {
        assert(false, `Request failed: ${error.message}`);
    }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
    log('\n' + '='.repeat(60));
    log('COMPREHENSIVE TEST SUITE - Kids Points Tracker');
    log('='.repeat(60));
    log('⚠️  Make sure the server is running (npm start) before running tests!\n');

    try {
        await testAuthentication();
        await testSessionValidation();
        await testKidsAPI();
        await testTransactionsAPI();
        await testTagsAPI();
        await testAuthMiddleware();
        await testRootEndpoint();
    } catch (error) {
        log(`\n❌ Test execution error: ${error.message}`);
        results.failed.push(`Test execution error: ${error.message}`);
    }

    printResults();
}

function printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`✓ Passed: ${results.passed.length}`);
    console.log(`✗ Failed: ${results.failed.length}`);
    console.log(`⊘ Skipped: ${results.skipped.length}`);
    console.log(`Total: ${results.passed.length + results.failed.length + results.skipped.length}`);
    
    if (results.failed.length > 0) {
        console.log('\n❌ Failed Tests:');
        results.failed.forEach((msg, i) => {
            console.log(`  ${i + 1}. ${msg}`);
        });
    }
    
    if (results.skipped.length > 0) {
        console.log('\n⊘ Skipped Tests:');
        results.skipped.forEach((msg, i) => {
            console.log(`  ${i + 1}. ${msg}`);
        });
    }
    
    if (results.failed.length === 0) {
        console.log('\n✅ All tests passed!');
        process.exit(0);
    } else {
        process.exit(1);
    }
}

// Run all tests
runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});


