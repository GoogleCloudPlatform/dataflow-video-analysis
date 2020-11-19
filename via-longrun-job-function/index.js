/**
 * Copyright 2020, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

// import modules
const PubSub = require(`@google-cloud/pubsub`);
const storage = require('@google-cloud/storage')();
const videoIntelligence = require('@google-cloud/video-intelligence');
const client = new videoIntelligence.VideoIntelligenceServiceClient();
const uniqid = require('uniqid');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

exports.viaLongRunJobFunc = (event, context, callback) => {
    const file = event;
    const videoPath = `gs://${file.bucket}/${file.name}`;
    const readFile = storage.bucket(file.bucket).file(file.name);

    const remoteReadStream = async () => {
        try {
            const res = readFile.createReadStream();
            return res;
        } catch (err) {
            console.error(err);
        };
    };

    function getAudioMetadata(path) {
        // check if file is a wav or flac audio file
        return new Promise((res, rej) => {
            ffmpeg.ffprobe(path, (err, metadata) => {
                if (err) return rej(err);
                const audioMetaData = require('util').inspect(metadata, false, null);
                if (!audioMetaData) throw new Error('Cannot find metadata of ' + path)
                return res(audioMetaData);
            });
        });
    };

    remoteReadStream().then(resRemoteReadStream => {
        getAudioMetadata(resRemoteReadStream).then(res => {
            resRemoteReadStream.destroy();
            // start cleanup - fluent-ffmpeg has an dirtyJSON output
            let resString = res.replace(/[&\/\\#+()$~%'"*?<>{}\s\n\]\[]/g, ''); // remove listed characters
            resString = resString.replace(/:/g, ','); // replace semicolon with commas
            let resArray = resString.split(','); // split string on commas
            // end cleanup
            let creationTime = resArray[resArray.indexOf('creation_time') + 1] + ':' + 
                resArray[resArray.indexOf('creation_time') + 2] + ':' + 
                resArray[resArray.indexOf('creation_time') + 3];
                console.log(creationTime);
            let duration = resArray[resArray.indexOf('duration') + 1];
            let pubSubObj = {
                'fileid': uniqid.time(),
                'filename': `gs://${file.bucket}/${file.name}`,
                'creation_time_utc': creationTime === undefined ? 'undefined' : creationTime,
                'duration_seconds': duration === undefined ? 'undefined' : duration
            };
            const videoContext = {
                speechTranscriptionConfig: {
                    languageCode: 'en-US',
                    enableAutomaticPunctuation: true,
                    enableSpeakerDiarization: true,
                    maxAlternatives: 1
                },
            };
            const request = {
                inputUri: videoPath,
                features: ['SPEECH_TRANSCRIPTION'],
                videoContext: videoContext
            };
            client.annotateVideo(request)
                .then(response => {
                    pubSubObj['video_response_operation'] = response[0].latestResponse.name;
                })
                .then(() => {
                    const pubSubData = JSON.stringify(pubSubObj);
                    const dataBuffer = Buffer.from(pubSubData);
                    const pubsub = new PubSub();
                    return pubsub
                        .topic('via-topic')
                        .publisher()
                        .publish(dataBuffer)
                        .then(messageId => {
                            console.log(`Message ${messageId} published.`);
                            callback(null, 'Success!');
                        })
                        .catch(err => {
                            console.error('ERROR:', err);
                        });
                });
        }).catch(err => console.error(err))
    });
};