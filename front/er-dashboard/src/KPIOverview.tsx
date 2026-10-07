import { Card, Text, Metric, Flex, ProgressBar } from "@tremor/react";

export default function KPIOverview() {
  return (
    <Card className="max-w-xs">
      <Text>Candidate Pairs Generated</Text>
      <Metric>3,456,789</Metric>
      <Flex className="mt-4">
        <Text>Pruned via Meta-blocking</Text>
        <Text>68%</Text>
      </Flex>
      <ProgressBar value={68} className="mt-2" color="blue" />
    </Card>
  );
}