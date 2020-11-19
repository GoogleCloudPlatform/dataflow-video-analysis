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

import React from 'react';
import Video from '../../Components/Video';
import moment from "moment";
import Timeline from "@material-ui/lab/Timeline";
import TimelineItem from "@material-ui/lab/TimelineItem";
import TimelineSeparator from "@material-ui/lab/TimelineSeparator";
import TimelineConnector from "@material-ui/lab/TimelineConnector";
import TimelineContent from "@material-ui/lab/TimelineContent";
import TimelineOppositeContent from "@material-ui/lab/TimelineOppositeContent";
import TimelineDot from "@material-ui/lab/TimelineDot";
import PlayCircleFilledIcon from '@material-ui/icons/PlayCircleFilled';
import { IconButton } from '@material-ui/core';
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";
import videojs from 'video.js';
import sw from 'stopword'
import Scrollbar from "react-scrollbars-custom";

function onSeek(element) {
    var video = videojs(element.videoid);
    video.currentTime(element.startsecs);
}

function findPhrase(phrase, list) {
    let searchList = []

    let wordList = list.map((list, index) => {
        let word = JSON.parse(list)
        return word.word.toLowerCase().replace(/[^\w\s]|_/g, "")
    })

    if (phrase.length >= 2){ 
        phrase.map((word, index) => {
            for (var i = 0; i < list.length; i++) {
                let element = JSON.parse(list[i])
                if (i < list.length - 1 & index < phrase.length - 1) {
                    if (word.toLowerCase() === element.word.toLowerCase()) {
                        if (JSON.stringify(wordList.slice(i, i + phrase.length)) === JSON.stringify(phrase)){
                            element.index = i
                            searchList.push(element)
                        }
                        
                    }
                }
            }
            
        });
    }
    else if (phrase.length === 1) {
        phrase.map((word, index) => {
            for (var i = 0; i < list.length; i++) {
                let element = JSON.parse(list[i])
                if (i < list.length - 1 & index < phrase.length - 1) {
                    let elementNext = JSON.parse(list[i + 1])
                    if (word.toLowerCase() === element.word.toLowerCase() & phrase[index + 1].toLowerCase() === elementNext.word.toLowerCase()) {
                        element.index = i
                        searchList.push(element)
                    }
                }
            }
            
        });
    } else {
        phrase.map((word, index) => {
            for (var i = 0; i < list.length; i++) {
                let element = JSON.parse(list[i])
                if (word.toLowerCase() === element.word.toLowerCase()) {
                    element.index = i
                    searchList.push(element)
                }
            }
            
        });
    }
    return searchList
}


function ResultView(props) {
    const { result } = props
    let videoId = result.fileid.snippet.toString()

    setInterval(() => {
        var video = videojs(videoId);
        video.load();
    }, 600000);

    let rawSearchTerm = document.getElementById("downshift-0-input").value.toLowerCase()
    let searchTerm = document.getElementById("downshift-0-input").value.split(' ');
    let markers = []

    if (rawSearchTerm.indexOf('\"') >= 0 && rawSearchTerm.indexOf('"') >= 0) {
        
        let rawSearchTermArray = rawSearchTerm.split(' ');

        rawSearchTermArray[0] = rawSearchTermArray[0].replace("\"", "");
        rawSearchTermArray[rawSearchTermArray.length - 1] = rawSearchTermArray[rawSearchTermArray.length - 1].replace("\"", "");

        let foundPhrases = findPhrase(rawSearchTermArray, result.words.raw, 0, 0, [])
        
        for (var i = 0; i < foundPhrases.length; i ++) {
            let wordResult = []
            let firstWordIndex = foundPhrases[i].index
            for (var k = 0; k < rawSearchTermArray.length; k++) {
                let element = JSON.parse(result.words.raw[firstWordIndex])
                wordResult.push(element.word)
                firstWordIndex = firstWordIndex + 1
            }
            markers.push({ word: wordResult.join(' '), startsecs: foundPhrases[i].startsecs, videoid: videoId, color: '#ff7961' })
        }

        const phraseStopWordsRemoved = sw.removeStopwords(rawSearchTermArray)

        if (phraseStopWordsRemoved.length >= 1) {
            for (var i = 0; i < phraseStopWordsRemoved.length; i++) {
                for (var k = 0; k < result.words.raw.length; k++) {
                    let element = JSON.parse(result.words.raw[k])
                    if ((markers.some(vendor => vendor['startsecs'] !== element.startsecs)) !== false & markers.length > 0 & phraseStopWordsRemoved[i].toLowerCase() === element.word.toLowerCase()) {
                        markers.push({ word: element.word, startsecs: element.startsecs, videoid: videoId, color: 'white' })
                    } else if (phraseStopWordsRemoved[i].toLowerCase() === element.word.toLowerCase() & markers.length === 0) {
                        markers.push({ word: element.word, startsecs: element.startsecs, videoid: videoId, color: 'white' })
                    }
                }
            }
        }
    } else {
        if (searchTerm.length === 1) {
            for (var k = 0; k < result.words.raw.length; k++) {
                let element = JSON.parse(result.words.raw[k])
                if (searchTerm[0].toLowerCase() === element.word.toLowerCase()) {
                    markers.push({ word: element.word, startsecs: element.startsecs, videoid: videoId, color: 'white' })
                }
            }
        }
        if (searchTerm.length !== 1) {
            for (var i = 0; i < searchTerm.length; i++) {
                for (var k = 0; k < result.words.raw.length; k++) {
                    let element = JSON.parse(result.words.raw[k])
                    if (searchTerm[i].toLowerCase() === element.word.toLowerCase()) {
                        markers.push({ word: element.word, startsecs: element.startsecs, videoid: videoId, color: 'white' })
                    }
                }
            }
        }
    }

    markers.sort(function (a, b) {
        return a.startsecs - b.startsecs;
    });

    const videoUrl = result.filename.raw.replace("gs://", "https://storage.cloud.google.com/");

    if (result._meta.score >= 0.1) {
        return (
            <li className="sui-result">
                <div className="sui-result__header">
                    <span
                        className="sui-result__title"
                        dangerouslySetInnerHTML={{ __html: result.filename.raw }}
                    />
                </div>
                <div className="sui-result__body">
                    <ul className="sui-result__details">
                        <li>
                            <span className="sui-result__key">Filename</span>{" "}
                            <span
                                className="sui-result__value"
                                dangerouslySetInnerHTML={{
                                    __html: result.filename.raw
                                }}
                            />
                        </li>
                        <li>
                            <span className="sui-result__key">Creation Time</span>{" "}
                            <span
                                className="sui-result__value"
                                dangerouslySetInnerHTML={{
                                    __html: moment(result.creation_time_utc.raw).format("dddd, MMMM Do YYYY, h:mm:ss a")
                                }}
                            />
                        </li>
                        <li>
                            <span className="sui-result__key">Duration Minutes</span>{" "}
                            <span
                                className="sui-result__value"
                                dangerouslySetInnerHTML={{
                                    __html: Math.floor(result.duration_seconds.snippet / 60) + " (mins)"
                                }}
                            />
                        </li>
                        <li>
                            <span className="sui-result__key">File ID</span>{" "}
                            <span className="sui-result__value">{result.fileid.snippet}</span>
                        </li>
                    </ul>
                </div>
                <div>

                    <Video
                        controls={true}
                        src={videoUrl}
                        videoid={videoId}
                        width="900"
                        height="500"
                    />

                    {markers.length < 3 ? (
                        <Scrollbar style={{ width: "100%", height: 200 }}>
                            <Timeline id={videoId} align="alternate">
                                {markers.map((element, index) => {
                                    return (
                                        <TimelineItem key={index}>
                                            <TimelineOppositeContent >
                                                <Typography variant="body2" color="textSecondary">
                                                    {moment.utc(element.startsecs * 1000).format('mm:ss')}
                                                </Typography>
                                            </TimelineOppositeContent>
                                            {index === (markers.length - 1)
                                                ? (
                                                    <TimelineSeparator>
                                                        <TimelineDot color="grey" variant="outlined">
                                                            <IconButton size="small" onClick={e => onSeek(element)} >
                                                                <PlayCircleFilledIcon />
                                                            </IconButton>
                                                        </TimelineDot>
                                                    </TimelineSeparator>
                                                )
                                                : (
                                                    <TimelineSeparator>
                                                        <TimelineDot color="grey" variant="outlined">
                                                            <IconButton size="small" onClick={e => onSeek(element)} >
                                                                <PlayCircleFilledIcon />
                                                            </IconButton>
                                                        </TimelineDot>
                                                        <TimelineConnector />
                                                    </TimelineSeparator>
                                                )
                                            }
                                            <TimelineContent>
                                                <Paper elevation={3} style={{ background: element.color, padding: "6px 16px", display: 'inline-block' }}>
                                                    <Typography>{element.word}</Typography>
                                                </Paper>
                                            </TimelineContent>
                                        </TimelineItem>)
                                })}
                            </Timeline>
                        </Scrollbar>
                    ) : (
                            <Scrollbar style={{ width: "100%", height: 400 }}>
                                <Timeline align="alternate">
                                    {markers.map((element, index) => {
                                        return (
                                            <TimelineItem key={index}>
                                                <TimelineOppositeContent >
                                                    <Typography variant="body2" color="textSecondary">
                                                        {moment.utc(element.startsecs * 1000).format('mm:ss')}
                                                    </Typography>
                                                </TimelineOppositeContent>
                                                {index === (markers.length - 1)
                                                    ? (
                                                        <TimelineSeparator>
                                                            <TimelineDot color="grey" variant="outlined">
                                                                <IconButton id={element.startsecs} size="small" onClick={e => onSeek(element)} >
                                                                    <PlayCircleFilledIcon />
                                                                </IconButton>
                                                            </TimelineDot>
                                                        </TimelineSeparator>
                                                    )
                                                    : (
                                                        <TimelineSeparator>
                                                            <TimelineDot color="grey" variant="outlined">
                                                                <IconButton id={element.startsecs} size="small" onClick={e => onSeek(element)} >
                                                                    <PlayCircleFilledIcon />
                                                                </IconButton>
                                                            </TimelineDot>
                                                            <TimelineConnector />
                                                        </TimelineSeparator>
                                                    )
                                                }
                                                <TimelineContent>
                                                    <Paper elevation={3} style={{ background: element.color, padding: "6px 16px", display: 'inline-block' }}>
                                                        <Typography>{element.word}</Typography>
                                                    </Paper>
                                                </TimelineContent>
                                            </TimelineItem>)
                                    })}
                                </Timeline>
                            </Scrollbar>
                        )}
                </div>
            </li>
        )
    } else {
        return (<div></div>)
    }
};
export default ResultView;