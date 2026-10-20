const axios = require('axios');
const b64 = (str) => Buffer.from(str).toString('base64');
const run = async () => {
    try {
        const sub = {
            source_code: b64('console.log("hello");'),
            language_id: 63,
            stdin: b64('')
        };
        const res = await axios.post('http://localhost:2358/submissions?base64_encoded=true&wait=true', sub);
        console.log(res.data);
        
        // Also test a C++ one that fails compilation
        const cppSub = {
            source_code: b64('#include <iostream>\nint main() { cout << "hello"; }'),
            language_id: 54,
            stdin: b64('')
        };
        const cppRes = await axios.post('http://localhost:2358/submissions?base64_encoded=true&wait=true', cppSub);
        console.log('CPP Compile Output:', Buffer.from(cppRes.data.compile_output || '', 'base64').toString('utf8'));
    } catch(e) {
        console.log(e.response ? e.response.data : e.message);
    }
};
run();
