import * as d3 from 'd3';
import dataset from './my_weather_data.json';

function drawChart() {
  // 1. Access data

  const temperatureMinAccessor = (d) => d.temperatureMin;
  const temperatureMaxAccessor = (d) => d.temperatureMax;
  const uvAccessor = (d) => d.uvIndex;
  const precipitationProbabilityAccessor = (d) => d.precipProbability;
  const precipitationTypeAccessor = (d) => d.precipType;
  const cloudAccessor = (d) => d.cloudCover;
  const dateParser = d3.timeParse('%Y-%m-%d');
  const dateAccessor = (d) => dateParser(d.date);

  // 2. Create chart dimensions

  const width = 600;
  let dimensions = {
    width: width,
    height: width,
    radius: width / 2,
    margin: {
      top: 120,
      right: 120,
      bottom: 120,
      left: 120,
    },
  };
  dimensions.boundedWidth =
    dimensions.width - dimensions.margin.left - dimensions.margin.right;
  dimensions.boundedHeight =
    dimensions.height - dimensions.margin.top - dimensions.margin.bottom;
  dimensions.boundedRadius =
    dimensions.radius - (dimensions.margin.left + dimensions.margin.right) / 2;

  // 3. Draw canvas

  const wrapper = d3
    .select('#wrapper')
    .append('svg')
    .attr('width', dimensions.width)
    .attr('height', dimensions.height);

  const bounds = wrapper
    .append('g')
    .style(
      'transform',
      `translate(${dimensions.margin.left + dimensions.boundedRadius}px, ${
        dimensions.margin.top + dimensions.boundedRadius
      }px)`
    );

  // 4. Create scales
  const defs = wrapper.append('defs');

  const gradientId = 'temperature-gradient';
  const gradient = defs.append('radialGradient').attr('id', gradientId);
  const numberOfStops = 10;
  const gradientColorScale = d3.interpolateYlOrRd;
  d3.range(numberOfStops).forEach((i) => {
    gradient
      .append('stop')
      .attr('offset', `${(i * 100) / (numberOfStops - 1)}%`)
      .attr('stop-color', gradientColorScale(i / (numberOfStops - 1)));
  });

  const angleScale = d3
    .scaleTime()
    .domain(d3.extent(dataset, dateAccessor))
    .range([0, 2 * Math.PI]);

  const radiusScale = d3
    .scaleLinear()
    .domain([
      ...d3.extent(dataset, temperatureMinAccessor),
      ...d3.extent(dataset, temperatureMaxAccessor),
    ])
    .range([0, dimensions.boundedRadius])
    .nice();

  const temperatureScale = d3
    .scaleLinear()
    .domain(
      d3.extent([
        ...dataset.map(temperatureMaxAccessor),
        ...dataset.map(temperatureMinAccessor),
      ])
    )
    .range([0, dimensions.boundedRadius]);

  const cloudRadiusScale = d3
    .scaleSqrt()
    .domain(d3.extent(dataset, cloudAccessor))
    .range([1, 10]);

  const precipitationRadiusScale = d3
    .scaleSqrt()
    .domain(d3.extent(dataset, precipitationProbabilityAccessor))
    .range([0, 7]);

  const precipitationTypes = ['rain', 'sleet', 'snow'];

  const precipitationTypesColorScale = d3
    .scaleOrdinal()
    .domain(precipitationTypes)
    .range(['#54a0ff', '#636e72', '#b2bec3']);

  // 6. Draw peripherals
  const peripherals = bounds.append('g');
  const months = d3.timeMonth.range(...angleScale.domain());

  const getCoordinatesFromAngle = (angle, offset = 1) => [
    offset * dimensions.boundedRadius * Math.cos(angle - Math.PI / 2),
    offset * dimensions.boundedRadius * Math.sin(angle - Math.PI / 2),
  ];

  const getXCoordinateFromData = (d, offset) =>
    getCoordinatesFromAngle(angleScale(dateAccessor(d)), offset)[0];
  const getYCoordinateFromData = (d, offset) =>
    getCoordinatesFromAngle(angleScale(dateAccessor(d)), offset)[1];

  // console.log(months);
  months.forEach((month) => {
    const angle = angleScale(month);
    const [x, y] = getCoordinatesFromAngle(angle, 1);

    peripherals
      .append('line')

      .attr('x2', x)
      .attr('y2', y)
      .attr('class', 'grid-line');
    const [labelX, labelY] = getCoordinatesFromAngle(angle, 1.38);
    peripherals
      .append('text')
      .text(d3.timeFormat('%b')(month))
      .attr('x', labelX)
      .attr('y', labelY)
      .attr('class', 'tick-label')
      .style(
        'text-anchor',
        Math.abs(labelX) < 5 ? 'middle' : labelX > 0 ? 'start' : 'end'
      );
  });
  const temperatureTicks = temperatureScale.ticks(4);
  const gridCircles = temperatureTicks.map((d) => {
    peripherals
      .append('circle')

      .attr('r', radiusScale(d))
      .attr('class', 'temperature-grids');
  });

  const ticklabelBackgrounds = temperatureTicks.map((d) => {
    if (d < 1) return;
    peripherals
      .append('rect')

      .attr('class', 'tick-temperature-background')
      .attr('y', -radiusScale(d) - 10)
      .attr('width', 40)
      .attr('height', 20)
      .attr('fill', '#f8f9fa');
  });
  const gridLabels = temperatureTicks.map((d) => {
    if (d < 1) return;
    peripherals
      .append('text')
      .attr('x', 4)
      .attr('class', 'tick-temperature-label')
      .attr('y', -radiusScale(d) + 2)
      .html(`${d}??F `);
  });

  const freezingCircle = peripherals
    .append('circle')
    .attr('r', radiusScale(32))
    .attr('class', 'freezing-circle');

  const areaGenerator = d3
    .areaRadial()
    .angle((d) => angleScale(dateAccessor(d)))
    .innerRadius((d) => radiusScale(temperatureMinAccessor(d)))
    .outerRadius((d) => radiusScale(temperatureMaxAccessor(d)));

  const area = bounds
    .append('path')
    .attr('d', areaGenerator(dataset))
    .style('fill', `url(#${gradientId})`);

  const uvIndexOffset = 0.95;
  const uvIndexThresold = 8;
  const uvGroup = bounds.append('g');

  const highUVDays = uvGroup
    .selectAll('line')
    .data(dataset.filter((d) => uvAccessor(d) > uvIndexThresold))
    .join('line')
    .attr('class', 'uv-line')
    .attr('x1', (d) => getXCoordinateFromData(d, uvIndexOffset))
    .attr('y1', (d) => getYCoordinateFromData(d, uvIndexOffset))
    .attr('x2', (d) => getXCoordinateFromData(d, uvIndexOffset + 0.1))
    .attr('y2', (d) => getYCoordinateFromData(d, uvIndexOffset + 0.1));

  const cloudGroup = bounds.append('g');
  const cloudOffset = 1.27;
  const cloudCover = cloudGroup
    .selectAll('circle')
    .data(dataset)
    .join('circle')
    .attr('r', (d) => cloudRadiusScale(cloudAccessor(d)))
    .attr('cx', (d) => getXCoordinateFromData(d, cloudOffset))
    .attr('cy', (d) => getYCoordinateFromData(d, cloudOffset))
    .attr('class', 'cloud-dot');

  const precipitationGroup = bounds.append('g');
  const precipitationOffset = 1.14;
  const precipitation = precipitationGroup
    .selectAll('circle')
    .data(dataset)
    .join('circle')
    .attr('r', (d) =>
      precipitationRadiusScale(precipitationProbabilityAccessor(d))
    )
    .attr('cx', (d) => getXCoordinateFromData(d, precipitationOffset))
    .attr('cy', (d) => getYCoordinateFromData(d, precipitationOffset))
    .style('fill', (d) =>
      precipitationTypesColorScale(precipitationTypeAccessor(d))
    )
    .attr('class', 'precipitation-dot');
  // 5. Draw data

  const annotationGroup = bounds.append('g');

  const drawAnnotation = (angle, offset, text) => {
    const [x1, y1] = getCoordinatesFromAngle(angle, offset);
    const [x2, y2] = getCoordinatesFromAngle(angle, 1.6);

    annotationGroup
      .append('line')
      .attr('x1', x1)
      .attr('y1', y1)
      .attr('x2', x2)
      .attr('y2', y2)
      .attr('class', 'annotation-line');
    annotationGroup
      .append('text')
      .text(text)
      .attr('x', x2 + 6)
      .attr('y', y2)
      .attr('class', 'annotation-text');
  };

  drawAnnotation(Math.PI * 0.23, cloudOffset, 'Cloud Cover');
  drawAnnotation(Math.PI * 0.26, precipitationOffset, 'Precipitation');

  drawAnnotation(
    Math.PI * 0.734,
    uvIndexOffset,
    `UV Index over ${uvIndexThresold}`
  );
  drawAnnotation(Math.PI * 0.7, 0.5, 'Temperature');
  drawAnnotation(
    Math.PI * 0.9,
    radiusScale(32) / dimensions.boundedRadius,
    'Freezing Temperature'
  );

  precipitationTypes.forEach((precipitation, index) => {
    const labelCoordinates = getCoordinatesFromAngle(Math.PI * 0.26, 1.6);

    annotationGroup
      .append('circle')
      .attr('cx', labelCoordinates[0] + 15)
      .attr('cy', labelCoordinates[1] + 16 * (index + 1))
      .attr('r', 4)
      .style('fill', precipitationTypesColorScale(precipitation));
    annotationGroup
      .append('text')
      .attr('x', labelCoordinates[0] + 25)
      .attr('y', labelCoordinates[1] + 16 * (index + 1))
      .text(precipitation)
      .attr('class', 'annotation-text');
  });
  // 7. Set up interactions

  const listenerCircle = bounds
    .append('circle')
    .attr('r', dimensions.width / 2)
    .attr('class', 'listener-circle')
    .on('mousemove', onMouseMove)
    .on('mouseleave', onMouseLeave);

  const tooltip = d3.select('#tooltip');
  const tooltipLine = bounds.append('path').attr('class', 'tooltip-line');
  function onMouseMove(e) {
    const getAngleFromCoordinates = (x, y) => Math.atan2(y, x);

    const [x, y] = d3.pointer(e);

    let angle = getAngleFromCoordinates(x, y) + Math.PI / 2;
    if (angle < 0) angle = 2 * Math.PI + angle;
    const arcGenerator = d3
      .arc()
      .innerRadius(0)
      .outerRadius(dimensions.boundedRadius * 1.6)
      .startAngle(angle - 0.015)
      .endAngle(angle + 0.015);
    tooltipLine.attr('d', arcGenerator());

    const outerCoordinates = getCoordinatesFromAngle(angle, 1.6);

    tooltip
      .style('opacity', 1)
      .style(
        'transform',
        `translate(calc(${
          outerCoordinates[0] < -50
            ? '40px + -100'
            : outerCoordinates[0] > 50
            ? '-40px + 0'
            : -50
        }% + ${
          outerCoordinates[0] +
          dimensions.margin.left +
          dimensions.boundedRadius
        }px), calc(${
          outerCoordinates[1] < -50
            ? '40px + -100'
            : outerCoordinates[1] > 50
            ? '-40px + 0'
            : -50
        }% + ${
          outerCoordinates[1] + dimensions.margin.top + dimensions.boundedRadius
        }px))`
      );
    const date = angleScale.invert(angle);
    const dateString = d3.timeFormat('%Y-%m-%d')(date);
    const dataPoint = dataset.find((d) => d.date === dateString);
    if (!dataPoint) return;
    d3.select('#tooltip-date').text(dataPoint.date);
    d3.select('#tooltip-temperature-min').text(
      temperatureMinAccessor(dataPoint)
    );
    d3.select('#tooltip-temperature-max').text(
      temperatureMaxAccessor(dataPoint)
    );
    d3.select('#tooltip-uv').text(uvAccessor(dataPoint));
    d3.select('#tooltip-cloud').text(cloudAccessor(dataPoint));
    d3.select('#tooltip-precipitation').text(
      precipitationProbabilityAccessor(dataPoint)
    );
    d3.select('#tooltip-precipitation-type').text(
      precipitationTypeAccessor(dataPoint)
    );
    // console.log(
    //   `translate(calc(-50%+${
    //     outerCoordinates[0] + dimensions.margin.left + dimensions.boundedRadius
    //   }px), calc(-50%+${
    //     outerCoordinates[1] + dimensions.margin.top + dimensions.boundedRadius
    //   }px))`
    // );
    tooltipLine.style('opacity', 1);
  }
  function onMouseLeave() {
    tooltip.style('opacity', 0);
    tooltipLine.style('opacity', 1);
  }
}
drawChart();
