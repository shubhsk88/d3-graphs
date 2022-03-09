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
      .html(`${d}°F `);
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
  // 5. Draw data
  // 7. Set up interactions
}
drawChart();
