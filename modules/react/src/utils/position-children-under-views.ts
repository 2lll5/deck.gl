// deck.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import * as React from 'react';
import {Children, createElement} from 'react';
import {View} from '@deck.gl/core';
import {inheritsFrom} from './inherits-from';
import evaluateChildren, {isComponent} from './evaluate-children';

import type {ViewOrViews} from '../deckgl';
import type {Deck, Viewport} from '@deck.gl/core';
import type {EventManager} from 'mjolnir.js';
import {DeckGlContext, type DeckGLContextValue} from './deckgl-context';

type DeckWithInternals = {
  _canvasTargets?: Record<string, {canvas: HTMLCanvasElement}>;
  canvas?: HTMLCanvasElement | null;
  eventManager?: EventManager | null;
  getEventManager?: (viewId?: string) => EventManager | null;
  _onViewStateChange: (params: {viewId: string} & Record<string, unknown>) => void;
};

/**
 * Group React children by view and canvas, then wrap them in DOM containers that track the
 * resolved viewport rectangles for the current frame.
 *
 * TODO - Can we supply a similar function for the non-React case?
 */
export default function positionChildrenUnderViews<ViewsT extends ViewOrViews>({
  children,
  deck,
  ContextProvider = DeckGlContext.Provider
}: {
  children: React.ReactNode[];
  deck?: Deck<ViewsT>;
  ContextProvider?: React.Context<DeckGLContextValue>['Provider'];
}): Record<string, React.ReactNode[]> {
  // @ts-expect-error accessing protected property
  const {viewManager} = deck || {};

  if (!viewManager || !viewManager.views.length) {
    return {};
  }
  const deckWithInternals = deck as unknown as DeckWithInternals;

  const views: Record<
    string,
    {
      canvasId: string;
      viewport: Viewport;
      children: React.ReactNode[];
    }
  > = {};
  const defaultViewId = (viewManager.views[0] as View).id;
  const defaultCanvasId = viewManager.getCanvasId?.(defaultViewId) || 'default-canvas';

  // Sort children by view id
  for (const child of children) {
    // Unless child is a View, position / render as part of the default view
    let viewId = defaultViewId;
    let viewChildren = child;

    if (isComponent(child) && inheritsFrom(child.type, View)) {
      viewId = child.props.id || defaultViewId;
      viewChildren = child.props.children;
    }

    const viewport = viewManager.getViewport(viewId) as Viewport;
    const viewState = viewManager.getViewState(viewId);
    const canvasId = viewManager.getCanvasId?.(viewId) || defaultCanvasId;

    // Drop (auto-hide) elements with viewId that are not matched by any current view
    if (viewport) {
      viewState.padding = viewport.padding;
      const {x, y, width, height} = viewport;
      // Resolve potentially relative dimensions using the deck.gl container size
      viewChildren = evaluateChildren(viewChildren, {
        x,
        y,
        width,
        height,
        viewport,
        viewState
      });

      if (!views[viewId]) {
        views[viewId] = {
          canvasId,
          viewport,
          children: []
        };
      }
      views[viewId].children.push(...Children.toArray(viewChildren));
    }
  }

  // Render views
  return Object.keys(views).reduce<Record<string, React.ReactNode[]>>((viewsByCanvasId, viewId) => {
    const {canvasId, viewport, children: viewChildren} = views[viewId];
    const {x, y, width, height} = viewport;
    const style = {
      position: 'absolute',
      left: x,
      top: y,
      width,
      height
    };

    const key = `view-${viewId}`;
    // If children is passed as an array, React will throw the "each element in a list needs
    // a key" warning. Sending each child as separate arguments removes this requirement.
    const viewElement = createElement('div', {key, id: key, style}, ...viewChildren);

    const contextValue: DeckGLContextValue = {
      deck,
      viewport,
      container:
        deckWithInternals._canvasTargets?.[canvasId]?.canvas.parentElement ||
        (deckWithInternals.canvas?.offsetParent as HTMLElement | null) ||
        deckWithInternals.canvas?.parentElement ||
        document.body,
      eventManager:
        deckWithInternals.getEventManager?.(viewId) || deckWithInternals.eventManager || null,
      onViewStateChange: params => {
        params.viewId = viewId;
        deckWithInternals._onViewStateChange(params);
      },
      widgets: []
    };
    const providerKey = `view-${viewId}-context`;
    viewsByCanvasId[canvasId] ||= [];
    viewsByCanvasId[canvasId].push(
      createElement(ContextProvider, {key: providerKey, value: contextValue}, viewElement)
    );
    return viewsByCanvasId;
  }, {});
}
