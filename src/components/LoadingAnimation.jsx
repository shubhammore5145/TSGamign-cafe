import React from 'react';
import './LoadingAnimation.css';

const tailCells = [
  ['an1', 'a'],
  ['an2', 'b'],
  ['an3', 'b'],
  ['an4', 'b'],
  ['an5', 'b'],
  ['an6', 'a'],
  ['an7', 'a'],
  ['an8', 'b'],
  ['an9', 'b'],
  ['an10', 'b'],
  ['an11', 'a'],
  ['an12', 'a'],
  ['an13', 'a'],
  ['an14', 'b'],
  ['an15', 'b'],
  ['an16', 'b'],
  ['an17', 'b'],
  ['an18', 'a'],
];

export default function LoadingAnimation() {
  return (
    <div className="loading-ghost-wrap" role="status" aria-label="Loading page">
      <div className="loading-ghost" aria-hidden="true">
        <div className="loading-ghost__body">
          <div className="loading-ghost__shape loading-ghost__shape--top0" />
          <div className="loading-ghost__shape loading-ghost__shape--top1" />
          <div className="loading-ghost__shape loading-ghost__shape--top2" />
          <div className="loading-ghost__shape loading-ghost__shape--top3" />
          <div className="loading-ghost__shape loading-ghost__shape--top4" />
          <div className="loading-ghost__shape loading-ghost__shape--st0" />
          <div className="loading-ghost__shape loading-ghost__shape--st1" />
          <div className="loading-ghost__shape loading-ghost__shape--st2" />
          <div className="loading-ghost__shape loading-ghost__shape--st3" />
          <div className="loading-ghost__shape loading-ghost__shape--st4" />
          <div className="loading-ghost__shape loading-ghost__shape--st5" />
          {tailCells.map(([area, phase]) => (
            <div
              key={area}
              className={`loading-ghost__tail-cell loading-ghost__tail-cell--${phase}`}
              style={{ gridArea: area }}
            />
          ))}
          <div className="loading-ghost__eye loading-ghost__eye--left" />
          <div className="loading-ghost__eye loading-ghost__eye--right" />
          <div className="loading-ghost__pupil loading-ghost__pupil--left" />
          <div className="loading-ghost__pupil loading-ghost__pupil--right" />
          <div className="loading-ghost__mouth loading-ghost__mouth--start" />
          <div className="loading-ghost__mouth loading-ghost__mouth--one" />
          <div className="loading-ghost__mouth loading-ghost__mouth--two" />
          <div className="loading-ghost__mouth loading-ghost__mouth--three" />
          <div className="loading-ghost__mouth loading-ghost__mouth--four" />
          <div className="loading-ghost__mouth loading-ghost__mouth--five" />
          <div className="loading-ghost__mouth loading-ghost__mouth--end" />
        </div>
        <div className="loading-ghost__shadow" />
      </div>
      <span className="loading-ghost__label">Loading</span>
    </div>
  );
}
