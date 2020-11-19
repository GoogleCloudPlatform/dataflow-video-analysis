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
import AppSearchAPIConnector from "@elastic/search-ui-app-search-connector";
import {
  PagingInfo,
  ResultsPerPage,
  Paging,
  Facet,
  SearchProvider,
  Results,
  SearchBox,
  Sorting
} from "@elastic/react-search-ui";
import ResultView from "./ResultView";
import { Layout } from "@elastic/react-search-ui-views";
import settings from '../../Settings'
import moment from "moment";

import "@elastic/react-search-ui-views/lib/styles/styles.css";
const connector = new AppSearchAPIConnector({
  searchKey: settings.searchKey,
  engineName: settings.engineName,
  endpointBase: settings.endpointBase,
  cacheResponses: settings.cacheResponses
});

const configurationOptions = {
  apiConnector: connector,
  autocompleteQuery: {
    suggestions: {
      types: {
        documents: {
          fields: ["transcript"]
        }
      },
      size: 5
    }
  },
  searchQuery: {
    result_fields: {
      filename: {
        raw: {}
      },
      creation_time_utc: {
        raw: {
        }
      },
      duration_seconds: {
        snippet: {
          size: 100,
          fallback: true
        }
      },
      fileid: {
        snippet: {
          size: 100,
          fallback: true
        }
      },
      transcript: {
        raw: {}
      },
      words: {
        raw: {}
      },
    },
    facets: {
      creation_time_utc: {
        type: "range",

        ranges: [
          {
            from: moment()
              .subtract(1, "months")
              .toISOString(),
            to: moment(),
            name: "Within the last Month"
          },
          {
            from: moment()
              .subtract(2, "months")
              .toISOString(),
            to: moment(),
            name: "Within the last 2 Months"
          },
          {
            from: moment()
              .subtract(12, "months")
              .toISOString(),
            to: moment(),
            name: "Within the last 12 Months"
          },
          {
            from: moment()
              .subtract(6, "months")
              .toISOString(),
            to: moment(),
            name: "Within the last 6 Months"
          },
          {
            from: moment()
              .subtract(3, "months")
              .toISOString(),
            to: moment(),
            name: "Within the last 3 Months"
          }

        ]
      },
    }
  }
};

export default function App(props) {

  return (
    <div>
    <SearchProvider config={configurationOptions}>
      <div className="App">
        <Layout
          header={<SearchBox
            autocompleteSuggestions={true}
          />}
          bodyContent={
            <Results
              titleField="name"
              urlField="image_url"
              resultView={ResultView}
            />
          }
          sideContent={
            <div>
              <Sorting
                label={"Sort by"}
                sortOptions={[
                  {
                    name: "Relevance",
                    value: "",
                    direction: ""
                  },
                ]}
              />
              <Facet field="creation_time_utc" label="Version" />
              <p className="sui-sorting sui-sorting__label">VIA v1.0.0<br></br>via-questions@google.com</p>
            </div>
          }
          bodyHeader={
            <>
              <PagingInfo />
              <ResultsPerPage />
            </>
          }
          bodyFooter={<Paging />}
        />   
      </div>
    </SearchProvider>
      </div>
  );
}