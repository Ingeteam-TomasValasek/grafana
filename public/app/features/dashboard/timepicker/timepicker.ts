import _ from 'lodash';
import angular from 'angular';
import moment from 'moment';

import * as rangeUtil from 'app/core/utils/rangeutil';
import * as customRangeCtrl from '../custom_time_ranges/range_ctrl';

export class TimePickerCtrl {
  static tooltipFormat = 'MMM D, YYYY HH:mm:ss';
  static defaults = {
    time_options: ['5m', '15m', '1h', '6h', '12h', '24h', '2d', '7d', '30d'],
    refresh_intervals: ['5s', '10s', '30s', '1m', '5m', '15m', '30m', '1h', '2h', '1d'],
  };

  dashboard: any;
  panel: any;
  absolute: any;
  timeRaw: any;
  editTimeRaw: any;
  tooltip: string;
  rangeString: string;
  customRangeString: string;
  timeOptions: any;
  customTimeOptions: any;
  refresh: any;
  isUtc: boolean;
  firstDayOfWeek: number;
  isOpen: boolean;
  isAbsolute: boolean;
  isCustom: boolean;
  isDay: boolean;
  isWeek: boolean;
  isRelative: boolean;
  customRangeIndex: any;
  dayShift: any;
  customDay: any;
  customWeek: any;
  relativeValue: any;
  relativeStep: any;
  startWeekOffset: any;
  endWeekOffset: any;

  /** @ngInject */
  constructor(private $scope, private $rootScope, private timeSrv) {
    this.$scope.ctrl = this;

    $rootScope.onAppEvent('shift-time-forward', () => this.move(1), $scope);
    $rootScope.onAppEvent('shift-time-backward', () => this.move(-1), $scope);
    $rootScope.onAppEvent('closeTimepicker', this.openDropdown.bind(this), $scope);

    this.dashboard.on('refresh', this.onRefresh.bind(this), $scope);

    // init options
    this.panel = this.dashboard.timepicker;
    _.defaults(this.panel, TimePickerCtrl.defaults);
    this.firstDayOfWeek = moment.localeData().firstDayOfWeek();

    // init time stuff

    // All this bellow is needed to be able to call lastShift function
    this.onRefresh();
    this.editTimeRaw = this.timeRaw;
    this.customTimeOptions = this.dashboard.ranges;
    this.refresh = {
      value: this.dashboard.refresh,
      options: _.map(this.panel.refresh_intervals, (interval: any) => {
        return { text: interval, value: interval };
      }),
    };
    // call last shift on reload
    this.lastShift(this.customTimeOptions);
  }

  onRefresh() {
    const time = angular.copy(this.timeSrv.timeRange());
    const timeRaw = angular.copy(time.raw);

    if (!this.dashboard.isTimezoneUtc()) {
      time.from.local();
      time.to.local();
      if (moment.isMoment(timeRaw.from)) {
        timeRaw.from.local();
      }
      if (moment.isMoment(timeRaw.to)) {
        timeRaw.to.local();
      }
      this.isUtc = false;
    } else {
      this.isUtc = true;
    }

    this.isCustom
      ? (this.rangeString = this.customRangeString)
      : (this.rangeString = rangeUtil.describeTimeRange(timeRaw));
    this.absolute = { fromJs: time.from.toDate(), toJs: time.to.toDate() };
    this.tooltip = this.dashboard.formatDate(time.from) + ' <br>to<br>';
    this.tooltip += this.dashboard.formatDate(time.to);
    this.timeRaw = timeRaw;
    // Commented out for Relative moves to work
    //this.isAbsolute = moment.isMoment(this.timeRaw.to);
  }

  zoom(factor) {
    this.$rootScope.appEvent('zoom-out', 2);
  }
  // Move function is modified for Custom events it checks for
  move(direction) {
    if (this.isRelative) {
      this.relativeMove(direction);
    } else if (this.isDay) {
      this.moveDay(direction);
    } else if (this.isWeek) {
      // Moving the week is simple therefor its done here not in separate function
      this.startWeekOffset += direction;
      this.endWeekOffset += direction;
      const result = customRangeCtrl.week(this.customWeek, this.startWeekOffset, this.endWeekOffset);
      this.applyCustomRange(result.week);
    } else {
      if (!this.isCustom) {
        const range = this.timeSrv.timeRange();

        const timespan = (range.to.valueOf() - range.from.valueOf()) / 2;
        let to, from;
        if (direction === -1) {
          to = range.to.valueOf() - timespan;
          from = range.from.valueOf() - timespan;
        } else if (direction === 1) {
          to = range.to.valueOf() + timespan;
          from = range.from.valueOf() + timespan;
          if (to > Date.now() && range.to < Date.now()) {
            to = Date.now();
            from = range.from.valueOf();
          }
        } else {
          to = range.to.valueOf();
          from = range.from.valueOf();
        }
        this.timeSrv.setTime({ from: moment.utc(from), to: moment.utc(to) });
      } else {
        const functionResult = customRangeCtrl.customMove(
          direction,
          this.customRangeIndex,
          this.customTimeOptions,
          this.dayShift
        );
        this.dayShift = functionResult.dayShift;
        this.customTimeOptionMoved(this.customTimeOptions[functionResult.index], this.dayShift);
      }
    }
  }

  openDropdown() {
    if (this.isOpen) {
      this.closeDropdown();
      return;
    }
    // when dropdown is opened timeOptions are reloaded
    this.onRefresh();
    this.editTimeRaw = this.timeRaw;
    this.timeOptions = rangeUtil.getRelativeTimesList(this.panel, this.rangeString);
    this.customTimeOptions = this.dashboard.ranges;
    this.customDay = this.dashboard.day;
    this.customWeek = this.dashboard.week;
    this.refresh = {
      value: this.dashboard.refresh,
      options: _.map(this.panel.refresh_intervals, (interval: any) => {
        return { text: interval, value: interval };
      }),
    };

    this.refresh.options.unshift({ text: 'off' });
    this.isOpen = true;
    this.$rootScope.appEvent('timepickerOpen');
  }

  closeDropdown() {
    this.isOpen = false;
    this.$rootScope.appEvent('timepickerClosed');
  }

  applyCustom() {
    if (this.refresh.value !== this.dashboard.refresh) {
      this.timeSrv.setAutoRefresh(this.refresh.value);
    }

    this.timeSrv.setTime(this.editTimeRaw);
    this.closeDropdown();
  }

  absoluteFromChanged() {
    this.editTimeRaw.from = this.getAbsoluteMomentForTimezone(this.absolute.fromJs);
    this.isCustom = false;
  }

  absoluteToChanged() {
    this.editTimeRaw.to = this.getAbsoluteMomentForTimezone(this.absolute.toJs);
    this.isCustom = false;
  }

  getAbsoluteMomentForTimezone(jsDate) {
    return this.dashboard.isTimezoneUtc() ? moment(jsDate).utc() : moment(jsDate);
  }

  setRelativeFilter(timespan) {
    const range = { from: timespan.from, to: timespan.to };

    if (this.panel.nowDelay && range.to === 'now') {
      range.to = 'now-' + this.panel.nowDelay;
    }
    // If relative option starts with Last enables navigation arrows
    if (timespan.display.slice(0, 4) === 'Last') {
      this.isAbsolute = true;

      this.relativeValue = parseUnit(timespan.from.slice(4), this.relativeValue);
      this.relativeStep = this.relativeValue[0] * -1;
    } else {
      this.isAbsolute = false;
    }
    this.timeSrv.setTime(range);
    this.closeDropdown();
    // Help properties
    this.isCustom = false;
    this.isRelative = true;
    this.isDay = false;
    this.isWeek = false;
  }

  lastShift(aRanges) {
    const result = customRangeCtrl.lastShift(aRanges);
    this.dayShift = result.dayShift;
    this.applyCustomRange(result.range);
    // Help properties
    this.isDay = false;
    this.isWeek = false;
    this.isRelative = false;
  }

  lastDay(aDay) {
    this.isDay = true;
    this.isWeek = false;
    this.isRelative = false;
    const result = customRangeCtrl.lastDay(aDay);
    this.dayShift = result.dayShift;
    this.applyCustomRange(aDay);
  }

  moveDay(aDirection) {
    this.dayShift += aDirection;
    const result = customRangeCtrl.shift(this.customDay, this.dayShift);
    this.applyCustomRange(result);
  }
  lastWeek(aWeek) {
    this.isDay = false;
    this.isWeek = true;
    this.isRelative = false;
    const result = customRangeCtrl.lastWeek(aWeek);
    this.startWeekOffset = result.startOffset;
    this.endWeekOffset = result.endOffset;
    this.applyCustomRange(result.week);
  }

  customTimeOptionPicked(aRange) {
    const time = angular.copy(this.timeSrv.timeRange());
    this.editTimeRaw.from = this.dashboard.formatDate(time.from);
    this.dayShift = customRangeCtrl.customTimeRangePicked('shiftByDay', aRange, 0, this.editTimeRaw).dayShift;
    // Help properties
    this.isDay = false;
    this.isWeek = false;
    this.isRelative = false;
    this.applyCustomRange(aRange);
  }

  customTimeOptionMoved(aRange, aDayShift) {
    this.dayShift = aDayShift;
    customRangeCtrl.customTimeRangePicked('shift', aRange, aDayShift, this.editTimeRaw);
    this.applyCustomRange(aRange);
  }

  applyCustomRange(aRange) {
    this.editTimeRaw.from = this.getAbsoluteMomentForTimezone(aRange.absoluteFrom);
    this.editTimeRaw.to = this.getAbsoluteMomentForTimezone(aRange.absoluteTo);
    this.applyCustom();
    // Setting up the name of Range
    this.customRangeString = aRange.name + ', ' + rangeUtil.describeTimeRange(this.editTimeRaw).substring(0, 12);
    if (aRange.type === 'day') {
      this.customRangeString = 'Day ' + aRange.absoluteFrom.slice(5, 10);
    }
    if (aRange.type === 'week') {
      this.customRangeString = 'Week from ' + aRange.absoluteFrom.slice(5, 10);
    }
    // Help properties
    this.isCustom = true;
    this.isAbsolute = true;

    this.customRangeIndex = this.customTimeOptions.indexOf(aRange);
  }

  relativeMove(aDirection) {
    // Direction -1 back // 1 forward
    const lPrevTimespan = this.timeSrv.timeRange().raw;
    const timespan = { from: '', to: '', active: false, display: '' };

    this.relativeStep += this.relativeValue[0] * aDirection;

    if (aDirection === 1) {
      timespan.from = lPrevTimespan.to;

      timespan.to = 'now' + this.relativeStep + this.relativeValue[1];
      if (this.relativeStep >= 0) {
        timespan.to = 'now';
        timespan.from = 'now' + -this.relativeValue[0] + this.relativeValue[1];
        this.relativeStep = this.relativeValue[0] * -1;
      }
      // After change of direction the from and to values are identical becouse of that there is a check
      if (timespan.from === timespan.to) {
        this.relativeStep += this.relativeValue[0] * aDirection;
        timespan.to = 'now' + this.relativeStep + this.relativeValue[1];
      }
    } else if (aDirection === -1) {
      timespan.to = lPrevTimespan.from;
      timespan.from = 'now' + this.relativeStep + this.relativeValue[1];
      // After change of direction the from and to values are identical becouse of that there is a check
      if (timespan.from === timespan.to) {
        this.relativeStep += this.relativeValue[0] * aDirection;
        timespan.from = 'now' + this.relativeStep + this.relativeValue[1];
      }
    }
    //timespan.active = false;
    this.setRelativeMove(timespan);
  }

  setRelativeMove(aTimespan) {
    const range = { from: aTimespan.from, to: aTimespan.to };

    if (this.panel.nowDelay && range.to === 'now') {
      range.to = 'now-' + this.panel.nowDelay;
    }

    this.timeSrv.setTime(range);
    // Help properties
    this.isCustom = false;
    this.isAbsolute = true;
    this.isRelative = true;
    this.isDay = false;
    this.isWeek = false;
  }
}

export function settingsDirective() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/timepicker/settings.html',
    controller: TimePickerCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {
      dashboard: '=',
    },
  };
}
// Help Function to get Numerical Values and time units from Relative Time Values (20h -> [20][h])
export function parseUnit(str, out) {
  if (!out) {
    out = [0, ''];
  }
  str = String(str);
  const num = parseFloat(str);
  out[0] = num;
  out[1] = str.match(/[\d.\-\+]*\s*(.*)/)[1] || '';
  return out;
}

export function timePickerDirective() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/timepicker/timepicker.html',
    controller: TimePickerCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {
      dashboard: '=',
    },
  };
}

angular.module('grafana.directives').directive('gfTimePickerSettings', settingsDirective);
angular.module('grafana.directives').directive('gfTimePicker', timePickerDirective);

import { inputDateDirective } from './input_date';
//import { active } from 'd3';
angular.module('grafana.directives').directive('inputDatetime', inputDateDirective);
