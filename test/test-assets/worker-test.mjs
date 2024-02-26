self.onmessage = (e)=>{
    self.postMessage(JSON.stringify({
        type: 'test-return'
    }));
};