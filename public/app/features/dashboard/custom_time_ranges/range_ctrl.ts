import moment from 'moment';

import * as aux from './aux';
/*
  Notes:
    Modes are as follows: Shif -> Called when CustomTimeRange is choosen in the timepicker and one of timepickers navigation arrows is clicked on
                          ShifByDay -> Called from timepicker it self when Custom Time Range is clicked on, Date is set based on "From"
                          option in timepicker
*/
export function customTimeRangePicked(mode, range, dayShift, editTimeRaw) {
  if (range.type === 'shift') {
    switch (mode) {
      case 'shift':
        const shiftResult = shift(range, dayShift);
        return shiftResult;

      case 'shiftByDay':
        const shiftByDayResult = shiftByDay(range, editTimeRaw);
        return {
          range: range,
          dayShift: shiftByDayResult.dayShift,
        };

      default:
        console.log(mode, ' mode not supported');
        throw new Error('Unknown mode');
    }
  } else {
    throw new TypeError('Unknown range type');
  }
}

export function customMove(direction, index, timeOption, dayShift) {
  if (aux.rangeIsValid(timeOption[index])) {
    if (timeOption[index].type === 'shift') {
      const shiftMoveResult = shiftMove(direction, index, timeOption, dayShift);
      return {
        index: shiftMoveResult.index,
        dayShift: shiftMoveResult.dayShift,
      };
    } else {
      throw new TypeError('Unknown range type');
    }
  }
  throw new Error('Invalid range');
}

export function shiftMove(direction, index, timeOption, dayShift) {
  if (aux.rangeIsValid(timeOption[index])) {
    let newDayPresent = 0;
    if (dayShift % 1 !== 0 || isNaN(dayShift) || dayShift.length === 0) {
      throw new Error('Invalid dayShift');
    }
    if (direction !== -1 && direction !== 0 && direction !== 1) {
      throw new Error('Invalid direction');
    }

    for (let i = 0; i < timeOption.length; i++) {
      newDayPresent = newDayPresent | timeOption[i].newDay;
    }

    if (direction === -1) {
      const result = backward(index, timeOption, dayShift, newDayPresent);
      return {
        index: result.index,
        dayShift: result.dayShift,
      };
    } else if (direction === 1) {
      const result = forward(index, timeOption, dayShift, newDayPresent);
      return {
        index: result.index,
        dayShift: result.dayShift,
      };
    }
  }
  throw new Error('Invalid range');
}

export function forward(index, timeOption, dayShift, newDayPresent) {
  if (timeOption.length === 1) {
    return {
      index: index,
      dayShift: dayShift + 1,
    };
  }

  if (!newDayPresent && index === timeOption.length - 1) {
    dayShift++;
  }
  // Index handling
  index = aux.getNextIndex(timeOption, index);
  // DayShift handling
  if (timeOption[index].newDay || timeOption.length === 1) {
    dayShift++;
  }

  return {
    index: index,
    dayShift: dayShift,
  };
}

export function backward(index, timeOption, dayShift, newDayPresent) {
  if (!newDayPresent && index === 0) {
    dayShift -= 1;
  }

  // Index handling
  if (index === 0) {
    index = timeOption.length - 1;
  } else {
    index--;
  }
  // DayShift handling

  if (timeOption[index].newDay) {
    dayShift -= 1;
  }

  if (timeOption[index].newDay && !timeOption[aux.getNextIndex(timeOption, index)].newDay) {
    dayShift += 1;
  } else if (timeOption[aux.getNextIndex(timeOption, index)].newDay && !timeOption[index].newDay) {
    dayShift -= 1;
  }

  return {
    index: index,
    dayShift: dayShift,
  };
}

// Sets range absoluteFrom and absoluteTo based on dayshift input
export function shift(range, dayShift) {
  if (aux.rangeIsValid(range)) {
    if (dayShift % 1 !== 0 || isNaN(dayShift) || dayShift.length === 0) {
      throw new Error('Invalid dayShift');
    }
    const now = new Date();
    let today, yesterday;
    now.setDate(now.getDate() + dayShift);

    today = aux.getDateString(now);

    if (range.newDay) {
      now.setDate(now.getDate() - 1);
      yesterday = aux.getDateString(now);
      range.absoluteFrom = yesterday + ' ' + range.from + ':00';
      range.absoluteTo = today + ' ' + range.to + ':00';
      return range;
    } else {
      range.absoluteFrom = today + ' ' + range.from + ':00';
      range.absoluteTo = today + ' ' + range.to + ':00';
      return range;
    }
  }
  throw new Error('Invalid range');
}

// Sets range absoluteFrom and absoluteTo based on TimeRaw.from from timepicker itself
export function shiftByDay(range, editTimeRaw) {
  if (aux.rangeIsValid(range)) {
    const from = moment(editTimeRaw.from).format('YYYY-MM-DD');
    const diff = moment().diff(from, 'days');
    if (range.newDay) {
      editTimeRaw.from = moment(editTimeRaw.from, 'YYYY-MM-DD').add(1, 'days');
    }
    const to = moment(editTimeRaw.from).format('YYYY-MM-DD');

    range.absoluteFrom = from + ' ' + range.from + ':00';
    range.absoluteTo = to + ' ' + range.to + ':00';
    return {
      range: range,
      dayShift: -diff,
    };
  }
  throw new Error('Invalid range');
}

export function lastShift(aRanges) {
  const temp = getToTimes(aRanges);
  // always retuns first defined shift of previos day, for now
  const result = customTimeRangePicked('shift', aRanges[temp.index], temp.dayShift, null);
  //console.log('result', result)
  return {
    range: result,
    dayShift: temp.dayShift,
  };
}
export function getToTimes(aRanges) {
  const lNow = moment();
  const lTimeNow = lNow.hour() * 60 + lNow.minute();
  //let lResultIndex;
  //console.log('day',lTimeNow,lNow);
  const lTimes = [];
  let dayShift = 0;
  for (let i = 0; i < aRanges.length; i++) {
    if (lTimeNow > aRanges[i].toHour * 60 + aRanges[i].toMin) {
      //lResultIndex = i;
    }
    lTimes[i] = aRanges[i].toHour * 60 + aRanges[i].toMin;
  }
  //console.log('lTimeNow',lTimeNow,'lTimes',lTimes);
  let closest = lTimes.reduce((prev, curr) => {
    return lTimeNow - curr < lTimeNow - prev && lTimeNow - curr > 0 ? curr : prev;
  });
  //console.log('closest',closest);
  if (closest > lTimeNow) {
    closest = Math.max(...lTimes);
    dayShift = -1;
  }
  //console.log('closest',closest);
  return {
    index: lTimes.indexOf(closest),
    dayShift: dayShift,
  };
}

export function lastDay() {
  //console.log('day');
}

export function lastWeek() {
  //console.log('week');
}
