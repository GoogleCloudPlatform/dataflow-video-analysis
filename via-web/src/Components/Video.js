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

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

class Video extends Component {
    playerId = this.props.videoid;
    player = {};
    
    componentDidMount() {
        this.initPlayer(this.props);
    }

    componentWillReceiveProps(nextProps){
        if(this.props.src !== nextProps.src){
            this.initPlayer(nextProps);
        }
    }

    componentWillUnmount() {
        if (this.player) this.player.dispose();
    }

    initPlayer(props) {
        const playerOptions = this.playerOptions(props);
        this.player = videojs(document.querySelector(`#${this.playerId}`), playerOptions);
        this.player.src(props.src)
        this.player.poster(props.poster)
    }

    playerOptions(props){
        const playerOptions = {};
        playerOptions.controls = props.controls;
        playerOptions.autoplay = props.autoplay;
        playerOptions.preload = props.preload;
        playerOptions.width = props.width;
        playerOptions.height = props.height;
        playerOptions.bigPlayButton = props.bigPlayButton;
        return playerOptions;
    }

    render() {
        return (
            <video id={this.playerId} className={`video-js ${this.props.bigPlayButtonCentered? 'vjs-big-play-centered' : ''} ${this.props.className}`}></video>
        )
    }
}

Video.propTypes = {
    src: PropTypes.string,
    poster: PropTypes.string,
    controls: PropTypes.bool,
    autoplay: PropTypes.bool,
    width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    hideControls: PropTypes.arrayOf(PropTypes.string),
    bigPlayButton: PropTypes.bool,
    bigPlayButtonCentered: PropTypes.bool,
    className: PropTypes.string
}

Video.defaultProps = {
    src: "",
    poster: "",
    controls: true,
    autoplay: false,
    className: "",
    hideControls: [],
    bigPlayButton: true,
    bigPlayButtonCentered: true
}

export default Video;