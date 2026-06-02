const { exec } = require("child_process");

function transcribeAudio(audioPath, callback) {
    exec(`whisper ${audioPath} --model base --language Hindi`, (err, stdout, stderr) => {
        if (err) {
            console.error("Error transcribing:", stderr);
            return callback(null);
        }
        console.log("Transcription:", stdout);
        callback(stdout);
    });
}

module.exports = transcribeAudio;
