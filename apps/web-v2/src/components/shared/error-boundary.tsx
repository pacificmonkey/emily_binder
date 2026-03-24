import { Component, type ReactNode } from 'react'
import * as Sentry from '@sentry/react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  section?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
      tags: { section: this.props.section },
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div role="alert" className="rounded-soft bg-danger-light p-6 text-center">
          <h2 className="text-lg font-semibold text-danger-dark">Something went wrong</h2>
          <p className="mt-2 text-danger-dark/80">
            {this.props.section
              ? `Couldn't load ${this.props.section}. Try refreshing the page.`
              : "Something went wrong. Try refreshing the page."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 rounded-soft bg-danger px-4 py-2 text-sm text-white hover:bg-danger-dark"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
