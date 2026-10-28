import { Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function TodaysPlan({ plan, firstDay, theme, reduceMotion, onAction }) {
  const activeIndex = plan.steps.findIndex((step) => !step.complete && !step.excluded);
  const plannedSteps = plan.steps.filter((step) => !step.excluded);
  const activeActionLabel = plan.activeAction?.kind === 'lesson' && !firstDay
    ? 'Continue to lesson'
    : plan.activeAction?.kind === 'lesson' && plan.activeAction.label !== 'Start your new lesson'
      ? 'Continue to lesson'
      : plan.activeAction?.label;
  const status = firstDay && !plan.allDone
    ? 'Day 1'
    : `${plan.completedCount} of ${plan.totalCount} done`;

  return (
    <View
      testID="home-plan"
      style={[styles.planCard, { backgroundColor: theme.planBackground }]}
    >
      <View style={styles.planHeader}>
        <Text testID="home-plan-title" style={styles.planTitle}>{"Today's plan"}</Text>
        <Text testID="home-plan-status" style={[styles.planStatus, { color: theme.planSoft }]}>
          {status}
        </Text>
      </View>

      <View
        testID="home-plan-stepper"
        accessibilityLabel={status}
        style={styles.planStepper}
      >
        {plan.steps.map((step, index) => {
          const active = index === activeIndex;
          const circleStyle = step.complete
            ? [styles.planCircle, { backgroundColor: theme.planSoft }]
            : active
              ? [styles.planCircle, styles.planCircleActive]
              : [styles.planCircle, styles.planCirclePending];
          const labelStyle = step.complete || active
            ? styles.planStepLabelActive
            : styles.planStepLabelPending;

          return (
            <Fragment key={step.id}>
              <View
                testID={`home-plan-step-${step.id}`}
                accessibilityState={step.excluded ? { disabled: true } : undefined}
                style={styles.planStep}
              >
                <View
                  testID={`home-plan-circle-${step.id}`}
                  style={circleStyle}
                >
                  <Text style={step.complete || active
                    ? [styles.planCircleTextActive, { color: theme.planBackground }]
                    : styles.planCircleTextPending}
                  >
                    {step.complete ? '✓' : step.excluded ? '–' : plannedSteps.indexOf(step) + 1}
                  </Text>
                </View>
                <Text style={labelStyle}>{step.label}</Text>
              </View>
              {index < plan.steps.length - 1 ? (
                <View
                  testID={`home-plan-connector-${index}`}
                  style={[
                    styles.planConnector,
                    { backgroundColor: step.complete ? theme.planSoft : 'rgba(255,255,255,0.18)' }
                  ]}
                />
              ) : null}
            </Fragment>
          );
        })}
      </View>

      {plan.allDone ? (
        <Pressable
          testID="home-plan-completion"
          accessibilityRole="button"
          accessibilityLabel="All done with today's plan! Practice more in the Hub"
          accessibilityState={{ disabled: true }}
          disabled
          style={[styles.planCta, styles.planCtaDisabled]}
        >
          <Text style={styles.planCtaText}>
            All done with today&apos;s plan! Practice more in the Hub
          </Text>
        </Pressable>
      ) : plan.activeAction ? (
        <>
          {plan.helperText ? (
            <Text testID="home-plan-helper" style={styles.planHelper}>
              {plan.helperText}
            </Text>
          ) : null}
          <Pressable
            testID="home-plan-cta"
            accessibilityRole="button"
            accessibilityLabel={activeActionLabel}
            onPress={onAction}
            style={({ pressed }) => [
              styles.planCta,
              firstDay && styles.firstDayPlanCta,
              { backgroundColor: theme.accent },
              pressed && (reduceMotion ? styles.planCtaPressedReduced : styles.planCtaPressed)
            ]}
          >
            <Text style={styles.planCtaText}>{activeActionLabel}</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  planCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 12
  },

  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16
  },

  planTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900'
  },

  planStatus: {
    fontSize: 12,
    fontWeight: '700'
  },

  planStepper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6
  },

  planStep: {
    flex: 1,
    alignItems: 'center',
    gap: 6
  },

  planCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },

  planCircleActive: {
    backgroundColor: '#FFFFFF'
  },

  planCirclePending: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)'
  },

  planCircleTextActive: {
    fontSize: 14,
    fontWeight: '900'
  },

  planCircleTextPending: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '900'
  },

  planStepLabelActive: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
    textAlign: 'center'
  },

  planStepLabelPending: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11.5,
    fontWeight: '700',
    textAlign: 'center'
  },

  // Pin connector to the circle midline: (circle 30 − bar 3) / 2.
  planConnector: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    marginTop: 13.5
  },

  planHelper: {
    color: 'rgba(220,235,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center'
  },

  planCta: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center'
  },

  firstDayPlanCta: {
    marginTop: 12
  },

  planCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800'
  },

  planCtaPressed: {
    transform: [{ scale: 0.97 }]
  },

  planCtaPressedReduced: {
    opacity: 0.7
  },

  planCtaDisabled: {
    backgroundColor: '#64748B'
  }
});
