// deck.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

// Widget Browser — consolidated test app for all widget integration scenarios.
// Run with: cd test/apps/widget-browser && npm run start-local

import React, {useState, useCallback, useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import {Map, NavigationControl, useControl} from 'react-map-gl/maplibre';
import {DeckGL} from '@deck.gl/react';
import {Deck, MapView, OrbitView, OrthographicView, PickingInfo} from '@deck.gl/core';
import type {MapViewState, OrbitViewState, OrthographicViewState, View} from '@deck.gl/core';
import {DataFilterExtension} from '@deck.gl/extensions';
import {GeoJsonLayer, ArcLayer, ScatterplotLayer} from '@deck.gl/layers';
import {_WMSLayer as WMSLayer} from '@deck.gl/geo-layers';
import {MapboxOverlay} from '@deck.gl/mapbox';
import type {MapboxOverlayProps} from '@deck.gl/mapbox';
import {
  CompassWidget,
  ZoomWidget,
  FullscreenWidget,
  ScreenshotWidget,
  ResetViewWidget,
  PopupWidget,
  IconWidget,
  ToggleWidget,
  SelectorWidget,
  _GeocoderWidget,
  _ScaleWidget,
  LoadingWidget,
  ThemeWidget,
  InfoWidget,
  ContextMenuWidget,
  _TimelineWidget,
  _StatsWidget,
  GimbalWidget,
  ScrollbarWidget,
  _SplitterWidget as SplitterWidget
} from '@deck.gl/widgets';
import '@deck.gl/widgets/stylesheet.css';
import 'maplibre-gl/dist/maplibre-gl.css';

// ─── Shared Data URLs ────────────────────────────────────────────────
const COUNTRIES =
  'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_scale_rank.geojson';
const AIR_PORTS =
  'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_10m_airports.geojson';
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// ─── StatePanel (shared) ─────────────────────────────────────────────
function StatePanel({state}: {state: Record<string, unknown>}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        background: 'rgba(0,0,0,0.8)',
        color: '#0f0',
        padding: 12,
        borderRadius: 8,
        fontFamily: 'monospace',
        fontSize: 11,
        maxHeight: '90vh',
        overflow: 'auto',
        zIndex: 1000,
        minWidth: 260
      }}
    >
      <div style={{fontWeight: 'bold', marginBottom: 8, color: '#fff', fontSize: 13}}>
        Widget State
      </div>
      {Object.entries(state).map(([key, value]) => (
        <div key={key} style={{marginBottom: 4}}>
          <span style={{color: '#aaa'}}>{key}: </span>
          <span>{JSON.stringify(value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Tab 1: MapView ──────────────────────────────────────────────────
// Combines widgets-9.2 showcase + controlled-widgets state/callbacks

function getMapLayers(filterRange: [number, number] = [2, 9]) {
  return [
    new WMSLayer({
      data: 'https://ows.terrestris.de/osm/service',
      serviceType: 'wms',
      layers: ['OSM-WMS']
    }),
    new GeoJsonLayer({
      id: 'base-map',
      data: COUNTRIES,
      stroked: true,
      filled: true,
      lineWidthMinPixels: 2,
      opacity: 0.4,
      getLineColor: [60, 60, 60],
      getFillColor: [200, 200, 200]
    }),
    new GeoJsonLayer({
      id: 'airports',
      data: AIR_PORTS,
      filled: true,
      pointRadiusMinPixels: 2,
      pointRadiusScale: 2000,
      getPointRadius: f => 11 - f.properties.scalerank,
      getFillColor: [200, 0, 80, 180],
      pickable: true,
      autoHighlight: true,
      getFilterValue: f => f.properties.scalerank,
      filterRange,
      extensions: [new DataFilterExtension({filterSize: 1})]
    }),
    new ArcLayer({
      id: 'arcs',
      data: AIR_PORTS,
      dataTransform: d => d.features.filter(f => f.properties.scalerank < 4),
      getSourcePosition: () => [-0.4531566, 51.4709959],
      getTargetPosition: f => f.geometry.coordinates,
      getSourceColor: [0, 128, 200],
      getTargetColor: [200, 0, 80],
      getWidth: 1
    })
  ];
}

function getTooltip(info: PickingInfo, widget: InfoWidget) {
  if (!info.object || info.layer?.id !== 'airports') return null;

  let text: string;
  switch (widget.props.mode) {
    case 'hover':
      text = `${info.object.properties.name} (${info.object.properties.abbrev})`;
      break;
    case 'click':
    case 'static':
      text = `${info.object.properties.name} (${info.object.properties.abbrev})\n${info.object.properties.type}\n${info.object.properties.featureclass} (${info.object.properties.location})`;
      break;
  }

  return {
    position: info.object.geometry.coordinates,
    text,
    style: {minWidth: '200px'}
  };
}

function createPin() {
  const div = document.createElement('div');
  Object.assign(div.style, {
    width: '32px',
    height: '32px',
    transform: 'translate(-50%,-24px)'
  });
  div.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 -960 960 960" fill="black"><path d="M360-440h80v-110h80v110h80v-190l-120-80-120 80v190Zm120 254q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z"/></svg>';
  return div;
}

const RUN_ICON = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" height="100%" viewBox="0 -960 960 960" width="100%" fill="currentColor"><path d="M520-40v-240l-84-80-40 176-276-56 16-80 192 40 64-324-72 28v136h-80v-188l158-68q35-15 51.5-19.5T480-720q21 0 39 11t29 29l40 64q26 42 70.5 69T760-520v80q-66 0-123.5-27.5T540-540l-24 120 84 80v300h-80Zm-36.5-723.5Q460-787 460-820t23.5-56.5Q507-900 540-900t56.5 23.5Q620-853 620-820t-23.5 56.5Q573-740 540-740t-56.5-23.5Z"/></svg>`;

const STAR_ICON =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" height="100%" viewBox="0 -960 960 960" width="100%" fill="currentColor"><path d="m354-287 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97-33 143ZM233-120l65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Zm247-350Z"/></svg>';
const STAR_ON_ICON =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" height="100%" viewBox="0 -960 960 960" width="100%" fill="currentColor"><path d="m233-120 65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Z"/></svg>';

const SINGLE_VIEW_ICON = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" /></svg>`;
const SPLIT_H_ICON = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="7" stroke="currentColor" fill="none" stroke-width="2" /><rect x="4" y="13" width="16" height="7" stroke="currentColor" fill="none" stroke-width="2" /></svg>`;
const SPLIT_V_ICON = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="16" stroke="currentColor" fill="none" stroke-width="2" /><rect x="13" y="4" width="7" height="16" stroke="currentColor" fill="none" stroke-width="2" /></svg>`;

function MapViewTab() {
  const [viewState, setViewState] = useState<MapViewState>({
    latitude: 51.47,
    longitude: 0.45,
    zoom: 4,
    bearing: 0,
    pitch: 30
  });
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('dark');
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastCallback, setLastCallback] = useState('(none)');
  const [filterRange, setFilterRange] = useState<[number, number]>([2, 9]);

  const onViewStateChange = useCallback(({viewState: vs}) => {
    setViewState(vs as MapViewState);
  }, []);

  const widgets = useMemo(
    () => [
      new _GeocoderWidget({geocoder: 'coordinates', _geolocation: true}),
      new ZoomWidget({
        onZoom: ({delta, zoom}) =>
          setLastCallback(`ZoomWidget.onZoom(delta=${delta}, zoom=${zoom.toFixed(1)})`)
      }),
      new CompassWidget({
        onReset: ({bearing, pitch}) =>
          setLastCallback(`CompassWidget.onReset(bearing=${bearing}, pitch=${pitch})`)
      }),
      new FullscreenWidget({
        onFullscreenChange: fs => setLastCallback(`FullscreenWidget.onFullscreenChange(${fs})`)
      }),
      new ScreenshotWidget(),
      new ResetViewWidget({
        initialViewState: {latitude: 51.47, longitude: 0.45, zoom: 4, bearing: 0, pitch: 30},
        onReset: () => setLastCallback('ResetViewWidget.onReset')
      }),
      new LoadingWidget({onLoadingChange: setLoading}),
      new _ScaleWidget({placement: 'bottom-right'}),
      new ThemeWidget({themeMode, onThemeModeChange: setThemeMode}),
      new ContextMenuWidget({
        getMenuItems: (info: PickingInfo) => {
          const name = info.layer?.id === 'airports' && info.object?.properties.name;
          return (
            name && [
              {label: `Airport: ${name}`},
              {value: 'open', label: 'Open in new tab'},
              {value: 'favorite', label: 'Set as favorite'},
              {value: 'filter', label: 'Exclude from filter'}
            ]
          );
        },
        onMenuItemSelected: console.log
      }),
      new InfoWidget({mode: 'hover', getTooltip, arrow: 10, offset: 10}),
      new PopupWidget({
        position: [-5, 52],
        marker: {element: createPin()},
        placement: 'top',
        offset: 20,
        content: `I'm here!`,
        closeOnClickOutside: true
      }),
      new _TimelineWidget({
        placement: 'bottom-left',
        timeRange: [2, 9],
        step: 1,
        time,
        onTimeChange: (t: number) => {
          setTime(t);
          setFilterRange([2, t]);
        },
        playing,
        onPlayingChange: (next: boolean) => {
          if (next && time >= 9) setTime(2);
          setPlaying(next);
        },
        playInterval: 1000
      }),
      new _StatsWidget({type: 'deck', expanded, onExpandedChange: setExpanded}),
      new IconWidget({
        placement: 'top-right',
        label: 'Run!',
        icon: RUN_ICON,
        onClick: () => setLastCallback('IconWidget.onClick')
      }),
      new ToggleWidget({
        placement: 'top-right',
        icon: STAR_ICON,
        onIcon: STAR_ON_ICON,
        label: 'Favorite',
        onLabel: 'Cancel',
        onColor: 'skyblue',
        onChange: checked => setLastCallback(`ToggleWidget.onChange(${checked})`)
      }),
      new SelectorWidget({
        placement: 'top-right',
        initialValue: 'single',
        options: [
          {value: 'single', label: 'Single view', icon: SINGLE_VIEW_ICON},
          {value: 'split-horizontal', label: 'Split horizontal', icon: SPLIT_H_ICON},
          {value: 'split-vertical', label: 'Split vertical', icon: SPLIT_V_ICON}
        ],
        onChange: v => setLastCallback(`SelectorWidget.onChange(${v})`)
      })
    ],
    [themeMode, expanded, time, playing]
  );

  const layers = useMemo(() => getMapLayers(filterRange), [filterRange]);

  return (
    <>
      <StatePanel
        state={{
          'viewState.bearing': Math.round(viewState.bearing ?? 0),
          'viewState.pitch': Math.round(viewState.pitch ?? 0),
          'viewState.zoom': (viewState.zoom ?? 0).toFixed(1),
          themeMode,
          statsExpanded: expanded,
          timelinePlaying: playing,
          timelineTime: time,
          loading,
          lastCallback
        }}
      />
      <DeckGL
        views={new MapView({repeat: true})}
        viewState={viewState}
        onViewStateChange={onViewStateChange}
        controller
        layers={layers}
        widgets={widgets}
      />
    </>
  );
}

// ─── Tab 2: InfoVis ──────────────────────────────────────────────────
// From widgets-infovis: OrbitView + OrthographicView, GimbalWidget, ScrollbarWidget

function generateData(count: number) {
  const result: {position: number[]; color: number[]}[] = [];
  for (let i = 0; i < count; i++) {
    result.push({
      position: [Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * 100 - 50],
      color: [Math.random() * 255, Math.random() * 255, Math.random() * 255]
    });
  }
  return result;
}

const INFOVIS_DATA = generateData(500);

function InfoVisTab() {
  return (
    <DeckGL
      views={[
        new OrbitView({id: 'orbit-view', x: 0, width: '50%', controller: true}),
        new OrthographicView({id: 'ortho-view', x: '50%', width: '50%', controller: true})
      ]}
      initialViewState={{
        'orbit-view': {target: [0, 0, 0], rotationX: 45, rotationOrbit: 0, zoom: 0},
        'ortho-view': {target: [0, 0, 0], zoom: 0}
      }}
      layers={[
        new ScatterplotLayer({
          id: 'scatter',
          data: INFOVIS_DATA,
          getPosition: d => d.position,
          getFillColor: d => d.color,
          getRadius: 3,
          pickable: true,
          autoHighlight: true,
          billboard: true
        })
      ]}
      widgets={[
        new ZoomWidget(),
        new GimbalWidget(),
        new FullscreenWidget(),
        new ResetViewWidget(),
        new ThemeWidget(),
        new _TimelineWidget({
          viewId: 'orbit-view',
          timeRange: [0, 600],
          formatLabel: (t: number) =>
            `${Math.floor(t / 60)
              .toString()
              .padStart(2, '0')}:${(t % 60).toFixed(0).padStart(2, '0')}`
        }),
        new ScrollbarWidget({
          viewId: 'ortho-view',
          contentBounds: [
            [-50, -50, -50],
            [50, 50, 50]
          ],
          placement: 'bottom-right',
          orientation: 'vertical'
        }),
        new ScrollbarWidget({
          viewId: 'ortho-view',
          contentBounds: [
            [-50, -50, -50],
            [50, 50, 50]
          ],
          placement: 'bottom-right',
          orientation: 'horizontal'
        })
      ]}
    />
  );
}

// ─── Tab 3: Multi-View Splitter ──────────────────────────────────────
// From widgets-multi-view-9.2 (React version) + controlled-widgets splitter demo

const SPLITTER_VIEW_LAYOUT = {
  orientation: 'horizontal',
  views: [
    new MapView({id: 'left', controller: true}),
    {
      orientation: 'vertical',
      views: [
        new MapView({id: 'right-top', controller: true}),
        new MapView({id: 'right-bottom', controller: true})
      ]
    }
  ]
} as const;

function MultiViewTab() {
  const [views, setViews] = useState<View[]>([]);

  const layers = [
    new GeoJsonLayer({
      id: 'base-map',
      data: COUNTRIES,
      stroked: true,
      filled: true,
      lineWidthMinPixels: 2,
      opacity: 0.4,
      getLineColor: [60, 60, 60],
      getFillColor: [200, 200, 200]
    }),
    new GeoJsonLayer({
      id: 'airports',
      data: AIR_PORTS,
      filled: true,
      pointRadiusMinPixels: 2,
      pointRadiusScale: 2000,
      getPointRadius: f => 11 - f.properties.scalerank,
      getFillColor: [200, 0, 80, 180],
      pickable: true,
      autoHighlight: true
    }),
    new ArcLayer({
      id: 'arcs',
      data: AIR_PORTS,
      dataTransform: d => d.features.filter(f => f.properties.scalerank < 4),
      getSourcePosition: () => [-0.4531566, 51.4709959],
      getTargetPosition: f => f.geometry.coordinates,
      getSourceColor: [0, 128, 200],
      getTargetColor: [200, 0, 80],
      getWidth: 1
    })
  ];

  return (
    <>
      <StatePanel state={{viewCount: views.length}} />
      <DeckGL
        views={views.length ? views : undefined}
        initialViewState={{latitude: 51.47, longitude: 0.45, zoom: 4}}
        layers={layers}
        widgets={[new SplitterWidget({viewLayout: SPLITTER_VIEW_LAYOUT, onChange: setViews})]}
      />
    </>
  );
}

// ─── Tab 4: Basemap Integration ──────────────────────────────────────
// MapLibre basemap via react-map-gl + MapboxOverlay, testing viewId: 'mapbox'

function DeckGLOverlay(props: MapboxOverlayProps & {interleaved?: boolean}) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

function BasemapTab() {
  const [interleaved, setInterleaved] = useState(false);
  const [lastCallback, setLastCallback] = useState('(none)');
  const [loading, setLoading] = useState(true);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('dark');

  const layers = [
    new GeoJsonLayer({
      id: 'airports',
      data: AIR_PORTS,
      filled: true,
      pointRadiusMinPixels: 2,
      pointRadiusScale: 2000,
      getPointRadius: f => 11 - f.properties.scalerank,
      getFillColor: [200, 0, 80, 180],
      pickable: true,
      autoHighlight: true
    }),
    new ArcLayer({
      id: 'arcs',
      data: AIR_PORTS,
      dataTransform: d => d.features.filter(f => f.properties.scalerank < 4),
      getSourcePosition: () => [-0.4531566, 51.4709959],
      getTargetPosition: f => f.geometry.coordinates,
      getSourceColor: [0, 128, 200],
      getTargetColor: [200, 0, 80],
      getWidth: 1
    })
  ];

  // Widgets with viewId: 'mapbox' — positioned by the map's control container
  const mapboxWidgets = [
    new FullscreenWidget({
      id: 'fs-mapbox',
      viewId: 'mapbox',
      placement: 'top-left',
      onFullscreenChange: fs => setLastCallback(`FullscreenWidget.onFullscreenChange(${fs})`)
    }),
    new LoadingWidget({
      id: 'loading-mapbox',
      viewId: 'mapbox',
      placement: 'top-left',
      onLoadingChange: setLoading
    }),
    new CompassWidget({
      id: 'compass-mapbox',
      viewId: 'mapbox',
      placement: 'top-right',
      onReset: ({bearing, pitch}) =>
        setLastCallback(`CompassWidget.onReset(bearing=${bearing}, pitch=${pitch})`)
    }),
    new ZoomWidget({
      id: 'zoom-mapbox',
      viewId: 'mapbox',
      placement: 'top-right',
      onZoom: ({delta, zoom}) =>
        setLastCallback(`ZoomWidget.onZoom(delta=${delta}, zoom=${zoom.toFixed(1)})`)
    })
  ];

  // Regular widgets — positioned by deck's overlay
  const regularWidgets = [
    new PopupWidget({
      id: 'popup-regular',
      position: [-5, 52],
      content: `Regular deck overlay widget`,
      closeOnClickOutside: true
    }),
    new ThemeWidget({
      id: 'theme-regular',
      placement: 'bottom-left',
      themeMode,
      onThemeModeChange: setThemeMode
    })
  ];

  return (
    <>
      <StatePanel
        state={{
          mode: interleaved ? 'interleaved' : 'overlaid',
          'mapbox widgets': mapboxWidgets.map(w => w.id).join(', '),
          'regular widgets': regularWidgets.map(w => w.id).join(', '),
          themeMode,
          loading,
          lastCallback
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 50,
          left: 10,
          zIndex: 1000
        }}
      >
        <button
          onClick={() => setInterleaved(prev => !prev)}
          style={{
            padding: '6px 12px',
            background: '#4466cc',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          {interleaved ? 'Switch to Overlaid' : 'Switch to Interleaved'}
        </button>
      </div>
      <Map
        key={interleaved ? 'interleaved' : 'overlaid'}
        initialViewState={{latitude: 51.47, longitude: 0.45, zoom: 4, bearing: 0, pitch: 30}}
        mapStyle={MAP_STYLE}
      >
        <DeckGLOverlay
          interleaved={interleaved}
          layers={layers}
          widgets={[...mapboxWidgets, ...regularWidgets]}
        />
        <NavigationControl position="top-right" />
      </Map>
    </>
  );
}

// ─── App Shell ───────────────────────────────────────────────────────

type TabId = 'mapview' | 'infovis' | 'multiview' | 'basemap';

const TABS: {id: TabId; label: string}[] = [
  {id: 'mapview', label: 'MapView'},
  {id: 'infovis', label: 'InfoVis'},
  {id: 'multiview', label: 'Multi-View'},
  {id: 'basemap', label: 'Basemap'}
];

function App() {
  const [tab, setTab] = useState<TabId>('mapview');

  return (
    <>
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          zIndex: 1000,
          display: 'flex',
          gap: 4
        }}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '6px 12px',
              background: tab === t.id ? '#4466cc' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'mapview' && <MapViewTab />}
      {tab === 'infovis' && <InfoVisTab />}
      {tab === 'multiview' && <MultiViewTab />}
      {tab === 'basemap' && <BasemapTab />}
    </>
  );
}

/* global document */
const container = document.body.appendChild(document.createElement('div'));
createRoot(container).render(<App />);
