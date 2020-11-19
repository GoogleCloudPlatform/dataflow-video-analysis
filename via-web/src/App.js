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
import Search from "./views/Search/Search.jsx";
import { createHashHistory } from 'history';
import {
  HashRouter,
  Route
} from 'react-router-dom';

export const history = createHashHistory()

class App extends Component {

  render() {
      return (
        <HashRouter>
          <div>
            <Route exact path='/' component={Search} />
          </div>
        </HashRouter>
    );
  }
}

export default App;
