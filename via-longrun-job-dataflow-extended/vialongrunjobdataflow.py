# Copyright 2020 Google LLC.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# [START VIA pubsub_to_bigquery]
import argparse
import logging
import json
import time
import dateparser
import apache_beam as beam
import google.cloud.dlp

from apache_beam.options.pipeline_options import PipelineOptions
from apache_beam.options.pipeline_options import SetupOptions
from apache_beam.options.pipeline_options import StandardOptions
from apache_beam.options.pipeline_options import GoogleCloudOptions
from google.cloud.dlp import DlpServiceClient
from elastic_app_search import Client

# function to get Video Intelligence API data from long audio job
def video_output_response(data):
    from oauth2client.client import GoogleCredentials
    from googleapiclient import discovery
    credentials = GoogleCredentials.get_application_default()
    pub_sub_data = json.loads(data)
    speech_service = discovery.build(
        'videointelligence', 'v1', credentials=credentials)
    get_operation = speech_service.operations().projects().locations(
    ).operations().get(name=pub_sub_data['video_response_operation'])
    response = get_operation.execute()

    # handle polling of Video Intelligence API
    sleep_duration_float_mintues = float(pub_sub_data['duration_seconds']) / 60
    sleep_duration = round(int(sleep_duration_float_mintues / 2))
    logging.info('Sleeping for: %s', sleep_duration)
    time.sleep(sleep_duration)

    retry_count = 10
    while retry_count > 0 and not response.get('done', False):
        retry_count -= 1
        time.sleep(120)
        response = get_operation.execute()

    # return response to include STT data and agent search word
    response_list = [response,
                     pub_sub_data['fileid'],
                     pub_sub_data['filename'],
                     pub_sub_data['duration_seconds'],
                     pub_sub_data['creation_time_utc']
                     ]

    return response_list

# function to enrich video_output function response
def video_parse_response(video_data):
    parse_stt_output_response = {
        'fileid': video_data[1],
        'filename': video_data[2],
        'duration_seconds': video_data[3],
        'creation_time_utc': str(dateparser.parse(video_data[4])),
        'words': []
    }

    string_transcript = ''

    # get transcript from stt_data
    for i in video_data[0]['response']['annotationResults'][0]['speechTranscriptions']:
        if 'transcript' in i['alternatives'][0]:
            string_transcript += str(i['alternatives'][0]['transcript']) + ' '
    
    # remove the ending whitespace
    parse_stt_output_response['transcript'] = string_transcript[:-1]

    # get words from video_data
    for element in video_data[0]['response']['annotationResults'][0]['speechTranscriptions']:
        if 'words' in element['alternatives'][0]:
            for word in element['alternatives'][0]['words']:
                if 'speakerTag' in word:
                    speaker_tag_value = word['speakerTag']
                    parse_stt_output_response['words'].append(
                        {'word': word['word'], 'startsecs': word['startTime'].strip('s'),
                        'endsecs': word['endTime'].strip('s'), 'speakertag': speaker_tag_value})

    return parse_stt_output_response

def elastic_search(video_data):
    
    es = Client(
    base_endpoint='',
    api_key='',
    use_https=True
    )

    doc = {
        'fileid': video_data['fileid'],
        'filename': video_data['filename'],
        'transcript': video_data['transcript'],
        'creation_time_utc': video_data['creation_time_utc'],
        'duration_seconds': video_data['duration_seconds'],
        'words': video_data['words']
    }
    res = es.index_document("via-engine",doc)
    logging.info(res)

    return video_data

def run(argv=None, save_main_session=True):
    """Build and run the pipeline."""
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        '--input_topic',
        help=('Input PubSub topic of the form '
              '"projects/<PROJECT>/topics/<TOPIC>".'))
    group.add_argument(
        '--input_subscription',
        help=('Input PubSub subscription of the form '
              '"projects/<PROJECT>/subscriptions/<SUBSCRIPTION>."'))
    parser.add_argument('--output_bigquery', required=True,
                        help='Output BQ table to write results to '
                             '"PROJECT_ID:DATASET.TABLE"')
    known_args, pipeline_args = parser.parse_known_args(argv)

    pipeline_options = PipelineOptions(pipeline_args)
    project_id = pipeline_options.view_as(GoogleCloudOptions).project

    pipeline_options.view_as(
        SetupOptions).save_main_session = save_main_session
    pipeline_options.view_as(StandardOptions).streaming = True
    p = beam.Pipeline(options=pipeline_options)

    # Read from PubSub into a PCollection.
    if known_args.input_subscription:
        messages = (p
                    | beam.io.ReadFromPubSub(
                        subscription=known_args.input_subscription)
                    .with_output_types(bytes))
    else:
        messages = (p
                    | beam.io.ReadFromPubSub(topic=known_args.input_topic)
                    .with_output_types(bytes))

    decode_messages = messages | 'DecodePubSubMessages' >> beam.Map(
        lambda x: x.decode('utf-8'))

    # Get Video data for long running video job
    video_output = decode_messages | 'VideoSpeechOutput' >> beam.Map(
        video_output_response)

    # Parse and enrich video_output response
    parse_video_output = video_output | 'ParseVideoSpeech' >> beam.Map(
        video_parse_response)
    
    # Send to Elastic Search
    elastic_search_response = parse_video_output | 'ElasticSearch' >> beam.Map(
        elastic_search)

    # Write to BigQuery
    bigquery_table_schema = {
        "fields": [
            {
                "mode": "NULLABLE",
                "name": "fileid",
                "type": "STRING"
            },
            {
                "mode": "NULLABLE",
                "name": "filename",
                "type": "STRING"
            },
            {
                "mode": "NULLABLE",
                "name": "creation_time_utc",
                "type": "TIMESTAMP"
            },
            {
                "mode": "NULLABLE",
                "name": "duration_seconds",
                "type": "FLOAT"
            },
            {
                "mode": "NULLABLE",
                "name": "transcript",
                "type": "STRING"
            },
            {
                "fields": [
                    {
                        "mode": "NULLABLE",
                        "name": "word",
                        "type": "STRING"
                    },
                    {
                        "mode": "NULLABLE",
                        "name": "startSecs",
                        "type": "FLOAT"
                    },
                    {
                        "mode": "NULLABLE",
                        "name": "endSecs",
                        "type": "FLOAT"
                    },
                    {
                        "mode": "NULLABLE",
                        "name": "speakertag",
                        "type": "INTEGER"
                    }
                ],
                "mode": "REPEATED",
                "name": "words",
                "type": "RECORD"
            }
        ]
    }

    elastic_search_response | 'WriteToBigQuery' >> beam.io.WriteToBigQuery(
        known_args.output_bigquery,
        schema=bigquery_table_schema,
        create_disposition=beam.io.BigQueryDisposition.CREATE_IF_NEEDED,
        write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND)

    p.run()


if __name__ == '__main__':
    logging.getLogger().setLevel(logging.DEBUG)
    run()
# [END VIA pubsub_to_bigquery]
